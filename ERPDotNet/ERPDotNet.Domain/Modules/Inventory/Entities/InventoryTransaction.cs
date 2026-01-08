using ERPDotNet.Domain.Common;
using ERPDotNet.Domain.Modules.Inventory.Enums;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;

// دفتر کل انبار (Ledger) - غیر قابل ویرایش و حذف
public class InventoryTransaction : BaseEntity
{
    public long Id { get; set; }
    
    public int? FiscalYearId { get; set; }
    public DateTime TransactionDate { get; set; }

    // لینک به سند مرجع
    public required long DocHeaderId { get; set; }
    public required long DocDetailId { get; set; }
    public required int DocTypeId { get; set; }

    // ابعاد کالا
    public required int ProductId { get; set; }
    public required int WarehouseId { get; set; }
    public int? LocationId { get; set; }
    public int? BatchId { get; set; }

    // اصلاح 1: استفاده از Enum به جای int برای امنیت محاسباتی
    public InventoryTransactionSign Sign { get; set; } 

    // مقدار همیشه مثبت ذخیره می‌شود (جهت با Sign مشخص می‌شود)
    public decimal Quantity { get; set; }

    // اصلاح 2: لینک به تراکنش مرجع (برای سناریوی ابطال/برگشت)
    // اگر این رکورد بابت ابطال رکورد دیگری ایجاد شده، آی‌دی آن اینجا می‌آید
    public long? RelatedTransactionId { get; set; }
    public InventoryTransaction? RelatedTransaction { get; set; }
}