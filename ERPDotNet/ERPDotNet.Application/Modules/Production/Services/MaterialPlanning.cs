namespace ERPDotNet.Application.Modules.Production.Services;

/// <summary>
/// برنامه‌ریزی چندسطحی مواد (MRP) و کسری سفارش‌های باز. محاسبه خالص است و به دیتابیس دسترسی ندارد.
///
/// - نیاز سفارش‌های باز: نیاز هر ماده منهای مصرف قطعی‌شده (حواله‌های پیش‌نویس هنوز از موجودی کم نشده‌اند)
/// - تقاضای برنامه (اختیاری): ساخت مقدار مشخصی از یک کالا؛ خودِ آن کالا خالص‌سازی نمی‌شود، مستقیماً باز می‌شود
/// - هر کالا یک بار و در عمیق‌ترین سطحی که در درخت‌ها دارد خالص می‌شود (low-level code)،
///   تا موجودی‌اش بین همه والدها تقسیم شود نه اینکه برای هر والد دوباره حساب شود
/// - کسری خالص = نیاز ناخالص − (موجودی قابل مصرف + در حال تولید سفارش‌های باز)
/// - کسری کالای تولیدی با فرمول فعال، تولید پیشنهادی می‌شود و فرمولش با همان مقدار باز می‌شود؛ بقیه خرید پیشنهادی
/// </summary>
public static class MaterialPlanning
{
    /// <summary>فرمول پیش‌فرض یک کالا؛ مقادیر به ازای مقدار پایه است</summary>
    public sealed record PlanBom(int BomId, string Title, int Version, decimal BaseQuantity, IReadOnlyList<PlanComponent> Components);

    public sealed record PlanComponent(int ProductId, decimal Quantity, decimal WastePercentage);

    public sealed record Demand(int ProductId, decimal Quantity, PlanBom Bom);

    public sealed record Input(
        IReadOnlyDictionary<int, PlanBom> Boms,
        IReadOnlyDictionary<int, decimal> OnHand,
        IReadOnlyDictionary<int, decimal> ScheduledReceipts,
        IReadOnlyDictionary<int, decimal> OpenOrderDemand,
        Demand? PlanDemand);

    public enum PlanAction
    {
        None = 0,
        Produce = 1,
        Purchase = 2
    }

    public sealed record Line(
        int ProductId,
        int Level,
        decimal OpenOrderDemand,
        decimal PlanDemand,
        decimal OnHand,
        decimal ScheduledReceipts,
        decimal NetShortage,
        PlanAction Action,
        PlanBom? Bom,
        bool IsDemandRoot)
    {
        public decimal GrossRequirement => OpenOrderDemand + PlanDemand;
    }

    public sealed record Result(List<Line> Lines, List<int> CyclicProducts);

    // عمق بیشتر از این یعنی حلقه در فرمول‌ها (ثبت فرمول جلوی حلقه را می‌گیرد؛ این فقط محافظ است)
    private const int MaxDepth = 50;

    public static Result Plan(Input input)
    {
        var levels = new Dictionary<int, int>();
        var cyclic = new HashSet<int>();

        void Visit(int productId, int depth)
        {
            if (depth > MaxDepth)
            {
                cyclic.Add(productId);
                return;
            }
            if (levels.TryGetValue(productId, out var known) && known >= depth) return;
            levels[productId] = depth;
            if (input.Boms.TryGetValue(productId, out var bom))
                foreach (var c in bom.Components) Visit(c.ProductId, depth + 1);
        }

        foreach (var productId in input.OpenOrderDemand.Keys) Visit(productId, 0);
        if (input.PlanDemand != null)
            foreach (var c in input.PlanDemand.Bom.Components) Visit(c.ProductId, 1);

        var orderGross = input.OpenOrderDemand.ToDictionary(x => x.Key, x => x.Value);
        var planGross = new Dictionary<int, decimal>();
        var lines = new List<Line>();

        if (input.PlanDemand is { } demand)
        {
            Explode(demand.Bom, demand.Quantity, planGross);
            lines.Add(new Line(demand.ProductId, 0, 0, demand.Quantity, 0, 0, demand.Quantity, PlanAction.Produce, demand.Bom, IsDemandRoot: true));
        }

        foreach (var (productId, level) in levels.OrderBy(x => x.Value).ThenBy(x => x.Key))
        {
            if (cyclic.Contains(productId)) continue;
            var fromOrders = orderGross.GetValueOrDefault(productId);
            var fromPlan = planGross.GetValueOrDefault(productId);
            var onHand = input.OnHand.GetValueOrDefault(productId);
            var scheduled = input.ScheduledReceipts.GetValueOrDefault(productId);
            // زیرمجموعه کالایی که از موجودی تأمین شده، نیازی ندارد و ردیف نمی‌گیرد
            if (fromOrders + fromPlan <= 0) continue;
            var net = Math.Max(0, Math.Round(fromOrders + fromPlan - onHand - scheduled, 6));

            var bom = input.Boms.GetValueOrDefault(productId);
            var action = net <= 0 ? PlanAction.None : bom != null ? PlanAction.Produce : PlanAction.Purchase;
            // فقط کسری باز می‌شود؛ بخش تأمین‌شده از موجودی، نیازی به مواد ندارد
            if (action == PlanAction.Produce) Explode(bom!, net, planGross);

            lines.Add(new Line(productId, level, fromOrders, fromPlan, onHand, scheduled, net, action, bom, IsDemandRoot: false));
        }

        return new Result(lines, cyclic.ToList());
    }

    private static void Explode(PlanBom bom, decimal quantity, Dictionary<int, decimal> gross)
    {
        var factor = quantity / (bom.BaseQuantity > 0 ? bom.BaseQuantity : 1);
        foreach (var c in bom.Components)
            gross[c.ProductId] = gross.GetValueOrDefault(c.ProductId)
                + Math.Round(c.Quantity * factor * (1 + c.WastePercentage / 100m), 6);
    }

    public sealed record OrderNeed(int OrderId, IReadOnlyList<(int ProductId, decimal Outstanding)> Materials);

    public sealed record OrderShortage(int OrderId, IReadOnlyList<(int ProductId, decimal Outstanding, decimal Shortage)> Materials)
    {
        public bool CanStart => Materials.All(m => m.Shortage <= 0);
    }

    /// <summary>
    /// کسری مستقیم هر سفارش باز: موجودی قابل مصرف به ترتیب اولویت (تاریخ شروع برنامه) بین سفارش‌ها تخصیص می‌یابد.
    /// فقط موجودی فعلی حساب می‌شود؛ «در حال تولید» هنوز برای شروع سفارش در دسترس نیست.
    /// </summary>
    public static List<OrderShortage> AllocateOrders(IEnumerable<OrderNeed> ordersByPriority, IReadOnlyDictionary<int, decimal> onHand)
    {
        var left = onHand.ToDictionary(x => x.Key, x => x.Value);
        return ordersByPriority.Select(order => new OrderShortage(order.OrderId, order.Materials.Select(m =>
        {
            var available = left.GetValueOrDefault(m.ProductId);
            var used = Math.Min(available, m.Outstanding);
            left[m.ProductId] = available - used;
            return (m.ProductId, m.Outstanding, m.Outstanding - used);
        }).ToList())).ToList();
    }
}
