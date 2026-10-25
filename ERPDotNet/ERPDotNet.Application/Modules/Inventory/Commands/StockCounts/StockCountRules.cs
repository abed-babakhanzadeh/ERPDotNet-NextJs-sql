namespace ERPDotNet.Application.Modules.Inventory.Commands.StockCounts;

public static class StockCountRules
{
    public readonly record struct StockKey(int ProductId, int? LocationId, int? BatchId);

    /// <summary>سطر اصلاحی؛ مقدار مثبت اضافی و منفی کسری است</summary>
    public record Adjustment(int ProductId, int? LocationId, int? BatchId, decimal Quantity);

    /// <summary>
    /// اختلاف هر سطر = شمارش منهای موجودی سیستمی لحظه شروع (موجودی دفتری منجمد).
    /// حرکتی که بعد از شروع قطعی شده واقعی است و دست نمی‌خورد؛ اصلاحیه فقط خطای شمارش را جبران می‌کند.
    /// </summary>
    public static List<Adjustment> ComputeAdjustments(IEnumerable<(StockKey Key, decimal System, decimal Counted)> lines) =>
        lines
            .Select(l => new Adjustment(l.Key.ProductId, l.Key.LocationId, l.Key.BatchId, l.Counted - l.System))
            .Where(a => a.Quantity != 0)
            .ToList();

    /// <summary>هر کالا/قفسه/بچ فقط یک بار در شمارش می‌آید</summary>
    public static List<string> FindDuplicates(IEnumerable<StockKey> keys) =>
        keys.Select((k, i) => (k, Row: i + 1))
            .GroupBy(x => x.k)
            .Where(g => g.Count() > 1)
            .Select(g => $"ردیف {g.Skip(1).First().Row}: این کالا با همین قفسه و بچ قبلاً در شمارش آمده است.")
            .ToList();
}
