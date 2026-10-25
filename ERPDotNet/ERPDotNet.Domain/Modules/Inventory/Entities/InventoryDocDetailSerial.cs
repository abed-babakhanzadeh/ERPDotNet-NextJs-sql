using System.ComponentModel.DataAnnotations;
using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;

/// <summary>شماره سریال‌های یک سطر سند انبار (برای کالای سریال‌دار)</summary>
public class InventoryDocDetailSerial : BaseEntity
{
    public long Id { get; set; }

    public long DocDetailId { get; set; }
    public InventoryDocDetail? DocDetail { get; set; }

    [MaxLength(100)] public required string SerialNumber { get; set; }
}
