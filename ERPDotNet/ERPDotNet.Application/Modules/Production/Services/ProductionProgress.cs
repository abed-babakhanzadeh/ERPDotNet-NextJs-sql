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
