namespace ERPDotNet.Application.Modules.ProductEngineering.Queries.GetWhereUsed;

// کلاسی برای دریافت خروجی خام تابع SQL
public class WhereUsedRecursiveResult
{
    public int BomHeaderId { get; set; }
    public int ProductId { get; set; }
    public int Level { get; set; }
    public string UsageType { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string Path { get; set; } = string.Empty;
}