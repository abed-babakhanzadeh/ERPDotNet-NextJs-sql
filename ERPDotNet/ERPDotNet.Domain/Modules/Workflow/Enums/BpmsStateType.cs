using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Domain.Modules.Workflow.Enums;

public enum BpmsStateType
{
    [Display(Name = "شروع")]
    Start = 1,
    
    [Display(Name = "میانی")]
    Intermediate = 2,
    
    [Display(Name = "پایانی")]
    End = 3
}