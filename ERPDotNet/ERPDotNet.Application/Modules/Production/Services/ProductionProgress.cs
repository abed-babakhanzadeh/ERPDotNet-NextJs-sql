using ERPDotNet.Application.Modules.Inventory.Contracts;
using ERPDotNet.Domain.Modules.Inventory.Enums;

namespace ERPDotNet.Application.Modules.Production.Services;

/// <summary>
/// پیشرفت اجرای سفارش تولید، فقط از روی اسناد انباری که به سفارش ارجاع دارند.
/// مقدار روی سفارش ذخیره نمی‌شود تا ابطال، رد یا ویرایش سند انبار بدون همگام‌سازی جداگانه دیده شود.
/// - سند قطعی‌شده: «انجام‌شده»؛ پیش‌نویس، در گردش و تأییدشده: «در جریان»؛ رد و ابطال: بی‌اثر
/// - سند صادره: مصرف مواد (به تفکیک کالا)
/// - سند وارده: سطر ضایعات ← ضایعات؛ کالای سفارش ← محصول؛ کالای دیگر ← برگشت مواد (کسر از مصرف)
/// </summary>
public static class ProductionProgress
{
    public const string ReferenceName = "ProductionOrder";
    public const string MaterialRole = "ProductionMaterial";
    public const string OutputRole = "ProductionOutput";
    public const string ScrapRole = "ProductionScrap";

    public sealed record Quantity(decimal Done, decimal Pending)
    {
        public static readonly Quantity Zero = new(0, 0);
        public Quantity Add(decimal value, bool done) => done ? this with { Done = Done + value } : this with { Pending = Pending + value };
    }

    public sealed record Result(
        IReadOnlyDictionary<int, Quantity> MaterialsByProduct,
        Quantity Output,
        Quantity Scrap,
        bool HasOpenDocs);

    /// <param name="MaterialId">سطر نیاز مواد سفارش؛ خالی برای ماده خارج از فرمول</param>
    public sealed record PlannedMaterial(int? MaterialId, int ProductId, decimal StandardQuantity, decimal RequiredQuantity);

    /// <summary>
    /// یک ماده با مصرف و انحراف آن. مبنای انحراف «مقدار تولیدشده» است (محصول سالم + ضایعات قطعی)،
    /// چون واحد ضایعات هم مواد مصرف کرده است:
    /// استاندارد = مصرف استاندارد فرمول × تولیدشده ÷ مقدار سفارش؛ مجاز = همان با ضایعات فرمول.
    /// </summary>
    public sealed record MaterialRow(
        int? MaterialId,
        int ProductId,
        decimal RequiredQuantity,
        Quantity Issued,
        decimal StandardForOutput,
        decimal AllowedForOutput)
    {
        public decimal RemainingQuantity => Math.Max(0, RequiredQuantity - Issued.Done - Issued.Pending);
        public decimal VarianceQuantity => Issued.Done - StandardForOutput;
        public decimal? VariancePercent => StandardForOutput == 0 ? null : Math.Round(VarianceQuantity / StandardForOutput * 100, 2);
        public bool OverAllowed => Issued.Done > AllowedForOutput;
    }

    public static decimal Produced(Result progress) => progress.Output.Done + progress.Scrap.Done;

    public static decimal? YieldPercent(Result progress) =>
        Produced(progress) == 0 ? null : Math.Round(progress.Output.Done / Produced(progress) * 100, 2);

    /// <summary>
    /// سطرهای مواد: اول سطرهای فرمول به ترتیب، بعد مواد خارج از فرمول.
    /// اگر یک کالا دو بار در فرمول آمده باشد، صادرشده به ترتیب سطرها بین آن‌ها پخش می‌شود.
    /// </summary>
    public static List<MaterialRow> Materials(IReadOnlyList<PlannedMaterial> planned, Result progress, decimal orderQuantity)
    {
        var ratio = orderQuantity > 0 ? Produced(progress) / orderQuantity : 0;
        var left = progress.MaterialsByProduct.ToDictionary(x => x.Key, x => x.Value);

        MaterialRow Row(int? materialId, int productId, decimal standard, decimal required, bool isLastOfProduct)
        {
            var available = left.GetValueOrDefault(productId, Quantity.Zero);
            var done = isLastOfProduct ? available.Done : Math.Min(available.Done, required);
            var pending = isLastOfProduct ? available.Pending : Math.Min(available.Pending, Math.Max(0, required - done));
            left[productId] = new Quantity(available.Done - done, available.Pending - pending);
            return new MaterialRow(materialId, productId, required, new Quantity(done, pending), standard * ratio, required * ratio);
        }

        var plannedProducts = planned.Select(m => m.ProductId).ToHashSet();
        return planned
            .Select((m, i) => Row(m.MaterialId, m.ProductId, m.StandardQuantity, m.RequiredQuantity,
                isLastOfProduct: !planned.Skip(i + 1).Any(x => x.ProductId == m.ProductId)))
            .ToList()
            .Concat(progress.MaterialsByProduct.Keys
                .Where(p => !plannedProducts.Contains(p))
                .Select(p => Row(null, p, 0, 0, isLastOfProduct: true)))
            .ToList();
    }

    public static bool IsDone(InventoryDocStatus status) => status == InventoryDocStatus.Posted;

    public static bool IsVoid(InventoryDocStatus status) =>
        status is InventoryDocStatus.Rejected or InventoryDocStatus.Cancelled;

    public static Result Compute(int orderProductId, IEnumerable<ReferencedDocLine> lines)
    {
        var materials = new Dictionary<int, Quantity>();
        var output = Quantity.Zero;
        var scrap = Quantity.Zero;
        var hasOpen = false;

        foreach (var line in lines)
        {
            if (IsVoid(line.Status) || line.Nature == InventoryNature.Transfer) continue;
            var done = IsDone(line.Status);
            hasOpen |= !done;

            if (line.Nature == InventoryNature.Output)
                materials[line.ProductId] = materials.GetValueOrDefault(line.ProductId, Quantity.Zero).Add(line.Quantity, done);
            else if (line.LineRole == ScrapRole)
                scrap = scrap.Add(line.Quantity, done);
            else if (line.ProductId == orderProductId)
                output = output.Add(line.Quantity, done);
            else
                materials[line.ProductId] = materials.GetValueOrDefault(line.ProductId, Quantity.Zero).Add(-line.Quantity, done);
        }

        return new Result(materials, output, scrap, hasOpen);
    }
}
