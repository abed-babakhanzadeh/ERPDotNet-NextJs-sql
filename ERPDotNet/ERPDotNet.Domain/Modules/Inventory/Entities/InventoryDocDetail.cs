using ERPDotNet.Domain.Common;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;

public class InventoryDocDetail : BaseEntity
{
    public long Id { get; set; }

    public long HeaderId { get; set; }
    public InventoryDocHeader? Header { get; set; }

    public required int ProductId { get; set; }

    [ForeignKey("ProductId")]
    public Product? Product { get; set; }

    // === دو واحدی (Dual Unit Support) ===
    // مقدار در واحد اصلی (مبنای محاسبه کاردکس)
    public decimal MainUnitQuantity { get; set; }
    
    // مقدار در واحد فرعی (آنچه کاربر وارد کرده)
    public decimal SubUnitQuantity { get; set; }
    
    // واحد فرعی (Nullable چون ممکن است کالا تک واحدی باشد)
    public int? SubUnitId { get; set; }

    // === ردیابی دقیق (Tracking) ===
    // کالا از کدام قفسه برداشته/گذاشته شده؟
    public int? LocationId { get; set; }
    public Location? Location { get; set; }

    // فقط برای سند انتقال: کالا در انبار مقصد در کدام قفسه قرار گرفته؟
    public int? DestinationLocationId { get; set; }
    public Location? DestinationLocation { get; set; }

    // کالا مربوط به کدام بچ نامبر است؟
    public int? BatchId { get; set; }
    public InventoryBatch? Batch { get; set; }

    // === رفرنس ریز اقلام (Line Level Reference) ===
    // این سطر دقیقاً مربوط به کدام سطر سند مرجع است؟ (مثلاً سطر ۵ سفارش خرید)
    [MaxLength(100)] 
    public string? ReferenceEntityName { get; set; } // مثال: "PurchaseOrder"
    
    public long? ReferenceEntityLineId { get; set; } // ID سطر در جدول مبنا

    public string? Description { get; set; }

    // بهای واحد واردشده کاربر برای سطر رسید (به واحد اصلی)؛ صادره و انتقال با میانگین ارزش‌گذاری می‌شوند
    public decimal? UnitCost { get; set; }

    // فقط برای کالای سریال‌دار: سریال‌های این سطر (تعدادشان باید با مقدار سطر برابر باشد)
    public ICollection<InventoryDocDetailSerial> Serials { get; set; } = new List<InventoryDocDetailSerial>();
}