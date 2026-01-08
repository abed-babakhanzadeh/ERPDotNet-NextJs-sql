using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;

public class DocumentSequence : BaseEntity
{
    public int Id { get; set; } // <--- اضافه شده (کلید اصلی)

    public int DocTypeId { get; set; }
    public int? FiscalYearId { get; set; }
    
    // آخرین شماره صادر شده
    public long LastValue { get; set; }
    
    // نکته: RowVersion از BaseEntity ارث‌بری می‌شود و نیازی به تعریف مجدد نیست.
}