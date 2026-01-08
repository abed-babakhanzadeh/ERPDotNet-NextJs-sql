using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;


// تنظیمات منحصر به هر انبار (نقطه سفارش و ...)
public class ItemWarehouseSetting : BaseEntity
{
    public int Id { get; set; }
    public required int InventoryItemProfileId { get; set; }
    public InventoryItemProfile? InventoryItemProfile { get; set; }
    
    public required int WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }

    public decimal MinStock { get; set; } = 0;
    public decimal MaxStock { get; set; } = 0;
    public decimal ReorderPoint { get; set; } = 0;
    
    // لوکیشن پیش‌فرض برای این کالا در این انبار (برای سرعت در رسید)
    public int? DefaultLocationId { get; set; }
    public Location? DefaultLocation { get; set; }
}
