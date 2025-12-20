namespace ERPDotNet.Application.Modules.ProductEngineering.Queries.GetBOMTree;

public class BOMFlatNodeDto
{
    public int Level { get; set; }
    public string Path { get; set; } = string.Empty;
    public int? ParentProductId { get; set; }
    
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;
    public string? UnitName { get; set; }
    
    public decimal Quantity { get; set; }
    public decimal TotalQuantity { get; set; }
    public decimal WastePercentage { get; set; }
    
    public int? BomId { get; set; }
}