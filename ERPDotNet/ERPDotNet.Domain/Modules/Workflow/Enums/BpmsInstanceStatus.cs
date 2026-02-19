using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Domain.Modules.Workflow.Enums;

public enum BpmsInstanceStatus
{
    [Display(Name = "در حال اجرا")]
    Running = 1,
    
    [Display(Name = "تکمیل شده")]
    Completed = 2,
    
    [Display(Name = "لغو شده / باطل شده")]
    Terminated = 3,
    
    [Display(Name = "معلق / نیازمند اصلاح")]
    Suspended = 4
}