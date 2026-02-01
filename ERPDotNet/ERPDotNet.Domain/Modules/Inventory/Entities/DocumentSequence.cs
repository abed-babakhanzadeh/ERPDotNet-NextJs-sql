
using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;

public class DocumentSequence : BaseEntity
{
    // اضافه کردن شناسه یکتا (چون در BaseEntity وجود ندارد)
    public int Id { get; set; }

    // نوع سند (نال‌پذیر برای حالت Global یا سالیانه)
    public int? DocTypeId { get; set; }
    
    // سال مالی (نال‌پذیر برای حالت Global یا بر اساس نوع)
    public int? FiscalYearId { get; set; }
    
    // آخرین شماره تولید شده
    public long LastValue { get; set; }
            // نکته: RowVersion از BaseEntity ارث‌بری می‌شود و نیازی به تعریف مجدد نیست.
}