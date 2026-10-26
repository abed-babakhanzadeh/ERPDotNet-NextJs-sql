using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.Contracts;
using ERPDotNet.Application.Modules.Production.Services;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using ERPDotNet.Domain.Modules.Production.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Production.Queries.GetMaterialPlan;

/// <param name="Level">عمیق‌ترین سطح کالا در درخت فرمول‌ها (۰: کالای درخواستی یا مواد مستقیم سفارش‌ها)</param>
/// <param name="OpenOrdersDemand">نیاز باقی‌مانده سفارش‌های باز (نیاز منهای مصرف قطعی)</param>
/// <param name="PlanDemand">نیاز ناشی از کالای درخواستی و تولیدهای پیشنهادی سطح‌های بالاتر</param>
/// <param name="ScheduledReceipts">باقی‌مانده تولید سفارش‌های باز همین کالا</param>
/// <param name="ActionId">۰ بدون اقدام، ۱ تولید پیشنهادی، ۲ خرید پیشنهادی</param>
public record MaterialPlanLineDto(
    int ProductId,
    string ProductCode,
    string ProductName,
    string UnitName,
    string SupplyTypeTitle,
    int Level,
    decimal OpenOrdersDemand,
    decimal PlanDemand,
    decimal GrossRequirement,
    decimal OnHand,
    decimal ScheduledReceipts,
    decimal NetShortage,
    int ActionId,
    string ActionTitle,
    string? BomTitle,
    bool IsDemandRoot
);

public record MaterialPlanShortageDto(int ProductId, string ProductCode, string ProductName, string UnitName, decimal Outstanding, decimal Shortage);

/// <param name="CanStart">همه مواد مستقیم باقی‌مانده سفارش از موجودی فعلی تأمین می‌شود</param>
public record MaterialPlanOrderDto(
    int Id,
    string OrderNumber,
    string ProductCode,
    string ProductName,
    DateTime? PlannedStartDate,
    int StatusId,
    string StatusTitle,
    int MaterialCount,
    int ShortCount,
    bool CanStart,
    List<MaterialPlanShortageDto> Shortages
);

public record MaterialPlanDto(
    List<MaterialPlanLineDto> Lines,
    List<MaterialPlanOrderDto> Orders,
    List<string> Warnings,
    bool StockLimitedToAccessibleWarehouses
);

/// <summary>
/// برنامه‌ریزی چندسطحی مواد: کسری مواد سفارش‌های باز (کسری کامپاوند) و/یا ساخت مقدار مشخصی از یک کالا (کسری محصول نهایی)
/// </summary>
public record GetMaterialPlanQuery : IRequest<MaterialPlanDto>
{
    public int? ProductId { get; set; }
    public decimal? Quantity { get; set; }
    public int? BomHeaderId { get; set; }
    public bool IncludeOpenOrders { get; set; } = true;
    // خالی: همه انبارهای در دسترس
    public List<int>? WarehouseIds { get; set; }
}

public class GetMaterialPlanValidator : AbstractValidator<GetMaterialPlanQuery>
{
    public GetMaterialPlanValidator()
    {
        RuleFor(x => x).Must(x => x.IncludeOpenOrders || x.ProductId.HasValue)
            .WithMessage("کالای درخواستی را انتخاب کنید یا سفارش‌های باز را در محاسبه بیاورید.");
        When(x => x.ProductId.HasValue, () =>
            RuleFor(x => x.Quantity).NotNull().GreaterThan(0).WithName("مقدار درخواستی"));
    }
}

public class GetMaterialPlanHandler : IRequestHandler<GetMaterialPlanQuery, MaterialPlanDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IInventoryReferenceReader _references;
    private readonly IInventoryAvailabilityReader _availability;

    public GetMaterialPlanHandler(IApplicationDbContext context, IInventoryReferenceReader references, IInventoryAvailabilityReader availability)
    {
        _context = context;
        _references = references;
        _availability = availability;
    }

    private sealed record ProductInfo(int Id, string Code, string Name, string UnitName, ProductSupplyType SupplyType);

    public async Task<MaterialPlanDto> Handle(GetMaterialPlanQuery request, CancellationToken cancellationToken)
    {
        var at = DateTime.UtcNow;
        var warnings = new List<string>();
        var products = new Dictionary<int, ProductInfo>();
        var rawBoms = new Dictionary<int, BOMHeader>();

        // ۱. سفارش‌های باز: نیاز باقی‌مانده مواد و باقی‌مانده تولید
        var orders = request.IncludeOpenOrders ? await LoadOpenOrdersAsync(cancellationToken) : [];
        var orderDemand = new Dictionary<int, decimal>();
        var scheduled = new Dictionary<int, decimal>();
        foreach (var o in orders)
        {
            foreach (var (productId, outstanding) in o.Outstanding)
                orderDemand[productId] = orderDemand.GetValueOrDefault(productId) + outstanding;
            scheduled[o.ProductId] = scheduled.GetValueOrDefault(o.ProductId) + o.RemainingOutput;
        }

        // ۲. کالای درخواستی با فرمول انتخاب‌شده یا پیش‌فرض
        BOMHeader? demandBom = null;
        if (request.ProductId is { } demandProductId)
            demandBom = await ProductionRequirements.ResolveBomAsync(_context, demandProductId, request.BomHeaderId, at, cancellationToken);

        // ۳. فرمول پیش‌فرض کالاهای تولیدی، سطح به سطح تا مواد خریدنی
        var frontier = orderDemand.Keys
            .Concat(demandBom?.Details.Where(d => !d.IsDeleted).Select(d => d.ChildProductId) ?? [])
            .Concat(demandBom != null ? [demandBom.ProductId] : [])
            .ToHashSet();
        while (frontier.Count > 0)
        {
            await LoadProductsAsync(frontier, products, cancellationToken);
            var manufactured = frontier.Where(id => products.TryGetValue(id, out var p) && p.SupplyType == ProductSupplyType.Manufactured
                && !rawBoms.ContainsKey(id)).ToList();
            var boms = await ProductionRequirements.UsableBoms(_context, at)
                .Where(b => manufactured.Contains(b.ProductId))
                .Include(b => b.Details)
                .AsNoTracking()
                .ToListAsync(cancellationToken);
            foreach (var group in boms.GroupBy(b => b.ProductId))
                rawBoms[group.Key] = ProductionRequirements.DefaultFirst(group.AsQueryable()).First();

            frontier = manufactured
                .Where(rawBoms.ContainsKey)
                .SelectMany(id => rawBoms[id].Details.Where(d => !d.IsDeleted).Select(d => d.ChildProductId))
                .Where(id => !products.ContainsKey(id))
                .ToHashSet();
        }

        // خدمات موجودی ندارند و در برنامه مواد نمی‌آیند
        bool Planned(int productId) => products.TryGetValue(productId, out var p) && p.SupplyType != ProductSupplyType.Service;
        MaterialPlanning.PlanBom ToPlan(BOMHeader b) => new(b.Id, b.Title, b.Version, b.BaseQuantity,
            b.Details.Where(d => !d.IsDeleted && Planned(d.ChildProductId)).OrderBy(d => d.Id)
                .Select(d => new MaterialPlanning.PlanComponent(d.ChildProductId, d.Quantity, d.WastePercentage)).ToList());

        var planBoms = rawBoms.ToDictionary(x => x.Key, x => ToPlan(x.Value));
        foreach (var p in products.Values.Where(p => p.SupplyType == ProductSupplyType.Manufactured && !rawBoms.ContainsKey(p.Id)
                     && p.Id != demandBom?.ProductId).OrderBy(p => p.Code))
            warnings.Add($"کالای تولیدی {p.Code} - {p.Name} فرمول ساخت فعالی ندارد؛ کسری آن به‌صورت خرید پیشنهاد شده است.");

        // ۴. موجودی قابل مصرف
        var stock = await _availability.GetUsableAsync(
            products.Keys.Where(Planned).ToList(), request.WarehouseIds, cancellationToken);

        // ۵. محاسبه
        var result = MaterialPlanning.Plan(new MaterialPlanning.Input(
            planBoms,
            stock.ByProduct,
            scheduled,
            orderDemand.Where(x => Planned(x.Key)).ToDictionary(x => x.Key, x => x.Value),
            demandBom == null ? null : new MaterialPlanning.Demand(demandBom.ProductId, request.Quantity!.Value, ToPlan(demandBom))));
        foreach (var id in result.CyclicProducts)
            warnings.Add($"فرمول کالای {products[id].Code} حلقه دارد و در برنامه حساب نشد.");

        var lines = result.Lines.Select(l =>
        {
            var p = products[l.ProductId];
            return new MaterialPlanLineDto(l.ProductId, p.Code, p.Name, p.UnitName, p.SupplyType.ToDisplay(), l.Level,
                l.OpenOrderDemand, l.PlanDemand, l.GrossRequirement, l.OnHand, l.ScheduledReceipts, l.NetShortage,
                (int)l.Action, ActionTitle(l.Action), l.Bom == null ? null : $"{l.Bom.Title} (نسخه {l.Bom.Version})", l.IsDemandRoot);
        }).ToList();

        // ۶. کسری مستقیم هر سفارش به ترتیب تاریخ شروع برنامه
        var allocation = MaterialPlanning.AllocateOrders(
            orders.Select(o => new MaterialPlanning.OrderNeed(o.Id, o.Outstanding.Where(m => Planned(m.ProductId)).ToList())),
            stock.ByProduct);
        var orderRows = orders.Zip(allocation, (o, a) =>
        {
            var shortages = a.Materials.Where(m => m.Shortage > 0).Select(m =>
            {
                var p = products[m.ProductId];
                return new MaterialPlanShortageDto(m.ProductId, p.Code, p.Name, p.UnitName, m.Outstanding, m.Shortage);
            }).ToList();
            return new MaterialPlanOrderDto(o.Id, o.OrderNumber, o.ProductCode, o.ProductName, o.PlannedStartDate,
                (int)o.Status, o.Status.ToDisplay(), a.Materials.Count, shortages.Count, a.CanStart, shortages);
        }).ToList();

        return new MaterialPlanDto(lines, orderRows, warnings, stock.LimitedToAccessibleWarehouses);
    }

    private static string ActionTitle(MaterialPlanning.PlanAction action) => action switch
    {
        MaterialPlanning.PlanAction.Produce => "تولید",
        MaterialPlanning.PlanAction.Purchase => "خرید",
        _ => "-"
    };

    private sealed record OpenOrder(
        int Id, string OrderNumber, int ProductId, string ProductCode, string ProductName,
        DateTime? PlannedStartDate, ProductionOrderStatus Status, decimal RemainingOutput,
        List<(int ProductId, decimal Outstanding)> Outstanding);

    /// <summary>سفارش‌های تأییدشده و در حال تولید، به ترتیب اولویت تخصیص موجودی</summary>
    private async Task<List<OpenOrder>> LoadOpenOrdersAsync(CancellationToken ct)
    {
        var orders = await _context.ProductionOrders.AsNoTracking()
            .Where(o => o.Status == ProductionOrderStatus.Released || o.Status == ProductionOrderStatus.InProgress)
            .OrderBy(o => o.PlannedStartDate == null).ThenBy(o => o.PlannedStartDate).ThenBy(o => o.Id)
            .Select(o => new { o.Id, o.OrderNumber, o.ProductId, ProductCode = o.Product!.Code, ProductName = o.Product.Name, o.PlannedStartDate, o.Status, o.Quantity })
            .ToListAsync(ct);
        if (orders.Count == 0) return [];

        var ids = orders.Select(o => o.Id).ToList();
        var lines = (await _references.GetLinesAsync(ProductionProgress.ReferenceName, ids.Select(i => (long)i).ToList(), ct))
            .ToLookup(l => l.ReferenceEntityId);
        var planned = (await _context.ProductionOrderMaterials.AsNoTracking()
                .Where(m => ids.Contains(m.ProductionOrderId))
                .OrderBy(m => m.Id)
                .Select(m => new { m.ProductionOrderId, Material = new ProductionProgress.PlannedMaterial(m.Id, m.ProductId, m.StandardQuantity, m.RequiredQuantity) })
                .ToListAsync(ct))
            .ToLookup(m => m.ProductionOrderId, m => m.Material);

        return orders.Select(o =>
        {
            var progress = ProductionProgress.Compute(o.ProductId, lines[o.Id]);
            var outstanding = ProductionProgress.Materials(planned[o.Id].ToList(), progress, o.Quantity)
                .Where(m => m.MaterialId != null)
                .GroupBy(m => m.ProductId)
                .Select(g => (g.Key, Math.Max(0, g.Sum(m => m.RequiredQuantity - m.Issued.Done))))
                .Where(m => m.Item2 > 0)
                .ToList();
            return new OpenOrder(o.Id, o.OrderNumber, o.ProductId, o.ProductCode, o.ProductName, o.PlannedStartDate, o.Status,
                Math.Max(0, o.Quantity - progress.Output.Done), outstanding);
        }).ToList();
    }

    private async Task LoadProductsAsync(IEnumerable<int> ids, Dictionary<int, ProductInfo> products, CancellationToken ct)
    {
        var missing = ids.Where(id => !products.ContainsKey(id)).ToList();
        if (missing.Count == 0) return;
        var rows = await _context.Products.AsNoTracking()
            .Where(p => missing.Contains(p.Id))
            .Select(p => new ProductInfo(p.Id, p.Code, p.Name, p.Unit != null ? p.Unit.Title : "", p.SupplyType))
            .ToListAsync(ct);
        foreach (var p in rows) products[p.Id] = p;
    }
}
