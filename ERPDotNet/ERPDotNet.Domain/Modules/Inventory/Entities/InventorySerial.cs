using System.ComponentModel.DataAnnotations;
using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;

/// <summary>
/// شماره سریال یک قلم کالا (کالای سریال‌دار). محل فعلی با قطعی شدن اسناد انبار به‌روز می‌شود.
/// </summary>
public class InventorySerial : BaseEntity
{
    public long Id { get; set; }
    public required int ProductId { get; set; }

    [MaxLength(100)] public required string SerialNumber { get; set; }

    public InventorySerialStatus Status { get; set; } = InventorySerialStatus.InStock;

    // محل فعلی؛ وقتی کالا خارج شده خالی است
    public int? WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }
    public int? LocationId { get; set; }
    public Location? Location { get; set; }

    // آخرین سندی که این سریال را جابه‌جا کرد
    public long? LastDocHeaderId { get; set; }
}

public enum InventorySerialStatus
{
    [Display(Name = "در انبار")]
    InStock = 1,

    [Display(Name = "خارج از انبار")]
    OutOfStock = 2
}
