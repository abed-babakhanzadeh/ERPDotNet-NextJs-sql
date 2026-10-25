namespace ERPDotNet.Domain.Modules.Inventory.Entities;

// دسترسی سطح داده: کاربری که حداقل یک ردیف دارد فقط انبارهای خودش را می‌بیند
// عمداً از BaseEntity ارث نمی‌برد تا حذف واقعی باشد (نه حذف نرم) و ایندکس یکتا با ردیف‌های حذف‌شده تداخل نکند
public class WarehouseUserAccess
{
    public int Id { get; set; }
    public int WarehouseId { get; set; }
    public required string UserId { get; set; }

    public Warehouse Warehouse { get; set; } = null!;
}
