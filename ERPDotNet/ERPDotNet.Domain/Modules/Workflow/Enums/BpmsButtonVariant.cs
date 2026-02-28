using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Domain.Modules.Workflow.Enums;

public enum BpmsButtonVariant
{
    [Display(Name = "آبی (پیش‌فرض)")]
    Default = 1,
    
    [Display(Name = "قرمز (رد / ابطال)")]
    Destructive = 2,
    
    [Display(Name = "توخالی (ارجاع / خنثی)")]
    Outline = 3,
    
    [Display(Name = "خاکستری (ثانویه)")]
    Secondary = 4,

    // 🌟 گزینه جذاب تاییدات
    [Display(Name = "سبز (تایید نهایی)")]
    Success = 5 
}