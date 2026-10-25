using System.ComponentModel.DataAnnotations;
using ERPDotNet.Domain.Common;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;

/// <summary>
/// انبارگردانی: موجودی سیستمی یک انبار هنگام شروع ثبت می‌شود و مقدار شمارش‌شده کنار آن می‌آید.
/// با نهایی شدن، اختلاف‌ها به سند اضافی (وارده) و کسری (صادره) تبدیل می‌شوند که مثل هر سند دیگر تأیید و قطعی می‌شوند.
/// </summary>
public class StockCount : BaseEntity
{
    public int Id { get; set; }

    public required int WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }

    public DateTime CountDate { get; set; }
    public StockCountStatus Status { get; set; } = StockCountStatus.Counting;

    [MaxLength(500)] public string? Description { get; set; }

    // اسناد اصلاحی که هنگام نهایی شدن ساخته شدند
    public long? SurplusDocId { get; set; }
    public long? ShortageDocId { get; set; }

    public ICollection<StockCountLine> Lines { get; set; } = new List<StockCountLine>();
}

public class StockCountLine : BaseEntity
{
    public long Id { get; set; }

    public int StockCountId { get; set; }
    public StockCount? StockCount { get; set; }

    public required int ProductId { get; set; }
    public Product? Product { get; set; }
    public int? LocationId { get; set; }
    public Location? Location { get; set; }
    public int? BatchId { get; set; }
    public InventoryBatch? Batch { get; set; }

    // موجودی سیستمی هنگام شروع شمارش
    public decimal SystemQuantity { get; set; }
    // null یعنی هنوز شمرده نشده
    public decimal? CountedQuantity { get; set; }
}

public enum StockCountStatus
{
    [Display(Name = "در حال شمارش")]
    Counting = 1,

    [Display(Name = "نهایی شده")]
    Finalized = 2
}
