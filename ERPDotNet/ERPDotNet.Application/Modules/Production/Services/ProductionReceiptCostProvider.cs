using ERPDotNet.Application.Modules.Inventory.Contracts;
using ERPDotNet.Domain.Modules.Inventory.Enums;

namespace ERPDotNet.Application.Modules.Production.Services;

/// <summary>
/// بهای رسیدهای سفارش تولید (مبنای «فقط مواد مصرفی»):
/// - محصول و ضایعات: بهای مواد قطعی‌شده سفارش (حواله منهای برگشت) منهای ارزشی که رسیدهای قبلی سفارش برده‌اند،
///   تقسیم بر مقدار این رسید؛ پس جمع ارزش رسیدها همیشه برابر بهای مواد است، حتی با رسید چندمرحله‌ای
/// - برگشت مواد: میانگین بهای حواله‌های همان ماده در این سفارش، تا بهای برگشت با بهای خروج برابر باشد
/// اگر رسید پیش از هر حواله‌ای قطعی شود بهای آن صفر است و بهای مواد بعدی به رسید بعدی می‌رسد.
/// </summary>
public class ProductionReceiptCostProvider : IReceiptCostProvider
{
    private readonly IInventoryReferenceReader _inventory;

    public ProductionReceiptCostProvider(IInventoryReferenceReader inventory)
    {
        _inventory = inventory;
    }

    public string ReferenceEntityName => ProductionProgress.ReferenceName;

    public async Task<IReadOnlyDictionary<long, decimal>> GetUnitCostsAsync(ReceiptCostRequest request, CancellationToken cancellationToken)
    {
        var posted = await _inventory.GetPostedCostsAsync(ReferenceEntityName, request.ReferenceEntityId, cancellationToken);

        static bool IsOutput(string? role) => role is ProductionProgress.OutputRole or ProductionProgress.ScrapRole;

        // حواله‌ها کاهش‌اند (علامت منفی) و برگشت‌ها افزایش؛ بهای مواد مصرفی مثبت می‌شود
        var materialCost = -posted.Where(l => l.Nature == InventoryNature.Output || (l.Nature == InventoryNature.Input && !IsOutput(l.LineRole)))
            .Sum(l => l.SignedCost);
        var alreadyReceived = posted.Where(l => l.Nature == InventoryNature.Input && IsOutput(l.LineRole)).Sum(l => l.SignedCost);

        var result = new Dictionary<long, decimal>();
        var outputLines = request.Lines.Where(l => IsOutput(l.LineRole)).ToList();
        var outputQuantity = outputLines.Sum(l => l.Quantity);
        if (outputQuantity > 0)
        {
            var unit = Math.Round(Math.Max(0, materialCost - alreadyReceived) / outputQuantity, 6, MidpointRounding.AwayFromZero);
            foreach (var line in outputLines) result[line.DetailId] = unit;
        }

        foreach (var line in request.Lines.Where(l => !IsOutput(l.LineRole)))
        {
            var issues = posted.Where(l => l.Nature == InventoryNature.Output && l.ProductId == line.ProductId).ToList();
            var quantity = -issues.Sum(l => l.SignedQuantity);
            if (quantity > 0)
                result[line.DetailId] = Math.Round(-issues.Sum(l => l.SignedCost) / quantity, 6, MidpointRounding.AwayFromZero);
        }
        return result;
    }
}
