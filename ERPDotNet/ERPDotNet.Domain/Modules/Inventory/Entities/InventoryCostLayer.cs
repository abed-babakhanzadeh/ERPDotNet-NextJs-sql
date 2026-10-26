using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;

/// <summary>
/// لایه بها در روش FIFO: مقداری که با یک بهای واحد وارد شده و هنوز مصرف نشده است.
/// دامنه لایه همان دامنه تراز است (شرکت، یا شرکت و انبار). ترتیب مصرف ترتیب ساخت لایه (Id) است، یعنی ترتیب قطعی شدن.
/// </summary>
public class InventoryCostLayer : BaseEntity
{
    public long Id { get; set; }
    public int? CompanyId { get; set; }
    public required int ProductId { get; set; }
    public int? WarehouseId { get; set; }

    // حرکت افزایشی که لایه را ساخته؛ لایه «اول دوره» (موجودی پیش از FIFO) حرکت ندارد
    public long? SourceTransactionId { get; set; }
    public InventoryTransaction? SourceTransaction { get; set; }

    public decimal UnitCost { get; set; }
    public decimal OriginalQuantity { get; set; }
    public decimal RemainingQuantity { get; set; }
}

/// <summary>
/// مصرف یک لایه توسط یک حرکت کاهشی؛ برگشت آن با ردیف منفی ثبت می‌شود تا ابطال دقیقاً همان لایه‌ها را برگرداند
/// </summary>
public class InventoryCostLayerConsumption
{
    public long Id { get; set; }

    public long LayerId { get; set; }
    public InventoryCostLayer? Layer { get; set; }

    public long TransactionId { get; set; }
    public InventoryTransaction? Transaction { get; set; }

    public decimal Quantity { get; set; }
    public decimal Cost { get; set; }
}
