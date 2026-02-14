
namespace ERPDotNet.Application.Modules.Inventory.DTOs;

public class InventoryBatchDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string BatchNumber { get; set; } = string.Empty;
    public DateTime? ManufactureDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string? SupplierBatchCode { get; set; }
    public string? Description { get; set; }
    public bool IsBlocked { get; set; }
    public string? BlockReason { get; set; }
    
    // فیلد محاسباتی برای فرانت
    public bool IsExpired => ExpiryDate.HasValue && ExpiryDate.Value.Date < DateTime.Now.Date;
    
    public string RowVersion { get; set; } = string.Empty;
}