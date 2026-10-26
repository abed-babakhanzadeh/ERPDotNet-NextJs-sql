using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;

/// <summary>
/// تراز ریالی یک کالا برای روش میانگین موزون متحرک: مقدار و ارزش؛ بهای میانگین = ارزش ÷ مقدار.
/// در سطح «شرکت» انبار خالی است؛ در سطح «انبار» برای هر انبار یک ردیف جدا وجود دارد.
/// شرکت‌ها هیچ‌وقت میانگین مشترک ندارند.
/// </summary>
public class InventoryCostBalance : BaseEntity
{
    public long Id { get; set; }
    public int? CompanyId { get; set; }
    public required int ProductId { get; set; }
    public int? WarehouseId { get; set; }

    public decimal Quantity { get; set; }
    public decimal Value { get; set; }

    public decimal AverageCost => Quantity > 0 ? Value / Quantity : 0;
}
