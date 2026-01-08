namespace ERPDotNet.Domain.Modules.Inventory.Enums;


public enum InventoryDocStatus
{
    Draft = 1,       // پیش‌نویس
    Submitted = 2,   // ارسال شده برای تایید (اختیاری)
    Approved = 3,    // تایید شده (آماده قطعی سازی)
    Rejected = 4,    // رد شده
    Posted = 5,      // قطعی شده (کسر موجودی)
    Cancelled = 6    // ابطال شده
}