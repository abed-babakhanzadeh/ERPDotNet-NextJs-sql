using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Domain.Modules.Inventory.Enums;

public enum InventoryDocStatus
{
    [Display(Name = "پیش‌نویس")]
    Draft = 1,       
    
    [Display(Name = "در جریان بررسی")] 
    InProcess = 2,   // جایگزین Submitted: سندی که در موتور BPMS در حال چرخش است
    
    [Display(Name = "نیازمند اصلاح")]
    RequiresRevision = 3, // ✨ وضعیت جدید: برگشت خورده از کارتابل مدیر به کاربر ثبت‌کننده
    
    [Display(Name = "تایید شده (آماده قطعی‌سازی)")]
    Approved = 4,    
    
    [Display(Name = "رد شده (بایگانی)")]
    Rejected = 5,    
    
    [Display(Name = "قطعی شده (کسر/اضافه موجودی)")]
    Posted = 6,      
    
    [Display(Name = "ابطال شده")]
    Cancelled = 7    
}