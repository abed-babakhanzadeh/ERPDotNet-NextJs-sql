namespace ERPDotNet.Application.Modules.ProductEngineering.Queries.GetWhereUsed;

public class WhereUsedRecursiveResult
{
    public int BomId { get; set; }
    public string BomTitle { get; set; } = string.Empty;
    public int BomVersion { get; set; }
    public int BomStatusId { get; set; }
    public int BomUsageId { get; set; }      // اضافه شده برای Usage
    
    public int ParentProductId { get; set; }
    public string ParentProductName { get; set; } = string.Empty;
    public string ParentProductCode { get; set; } = string.Empty;
    
    public string UnitName { get; set; } = string.Empty;
    
    public string UsageType { get; set; } = string.Empty; 
    public decimal Quantity { get; set; }
    
    public int Level { get; set; }
    public string Path { get; set; } = string.Empty;
}