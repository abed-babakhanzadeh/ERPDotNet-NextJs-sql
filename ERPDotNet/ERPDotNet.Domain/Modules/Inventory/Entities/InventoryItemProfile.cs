using ERPDotNet.Domain.Common;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;

// اکستنشن کالا: ویژگی‌های انبارداری
public class InventoryItemProfile : BaseEntity
{
    public int Id { get; set; }
    public required int ProductId { get; set; }
    public Product? Product { get; set; }

    public bool IsBatchManaged { get; set; } = false;
    public bool IsSerialManaged { get; set; } = false;
    public int? ShelfLifeDays { get; set; }

    // واحد اصلی شمارش در انبار
    public required int MainInventoryUnitId { get; set; }
    public Unit? MainInventoryUnit { get; set; }

    public ICollection<ItemWarehouseSetting> WarehouseSettings { get; set; } = new List<ItemWarehouseSetting>();
}
