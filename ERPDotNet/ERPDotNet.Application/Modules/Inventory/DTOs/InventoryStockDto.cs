namespace ERPDotNet.Application.Modules.Inventory.DTOs;

public class InventoryStockDto
{
    public long Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;
    public string UnitTitle { get; set; } = string.Empty;

    // موجودی فیزیکی (آنچه در انبار دیده می‌شود)
    public decimal QuantityOnHand { get; set; }
    
    // موجودی تعهد شده (فروخته شده ولی حمل نشده)
    public decimal QuantityReserved { get; set; }
    
    // موجودی قرنطینه (QC) - فعلاً صفر است ولی جایش را رزرو می‌کنیم [Future Proofing]
    // این یعنی فردا که ماژول QC بیاید، فرانت‌اند و DTO تغییری نمی‌کنند
    public decimal QuantityBlocked { get; set; } = 0;

    // موجودی قابل دسترس (Available)
    // منطق: موجودی کل - رزرو - مسدود
    public decimal AvailableQuantity => QuantityOnHand - QuantityReserved - QuantityBlocked;

    // اطلاعات تکمیلی
    public string LocationCode { get; set; } = string.Empty;
    public string LocationPath { get; set; } = string.Empty; // مسیر درختی برای نمایش بهتر
    public string BatchNumber { get; set; } = string.Empty;
}