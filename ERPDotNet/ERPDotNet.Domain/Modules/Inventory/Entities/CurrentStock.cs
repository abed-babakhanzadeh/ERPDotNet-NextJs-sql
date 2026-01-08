using ERPDotNet.Domain.Common;
using ERPDotNet.Domain.Modules.BaseInfo.Entities; // فرض بر اینکه Product اینجاست

namespace ERPDotNet.Domain.Modules.Inventory.Entities;

public class CurrentStock : BaseEntity
{
    public long Id { get; set; }

    public required int WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; } // <--- اضافه شد

    public required int ProductId { get; set; }
    public Product? Product { get; set; } // <--- اضافه شد
    
    public int? LocationId { get; set; }
    public Location? Location { get; set; } // <--- اضافه شد

    public int? BatchId { get; set; }
    public InventoryBatch? Batch { get; set; } // <--- اضافه شد

    public decimal QuantityOnHand { get; set; }
    public decimal QuantityReserved { get; set; }
}