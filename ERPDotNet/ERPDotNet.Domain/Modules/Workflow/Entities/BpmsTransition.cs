using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.Workflow.Entities;

public class BpmsTransition : BaseEntity
{
    public int Id { get; set; }
    public int ProcessVersionId { get; set; }
    
    public int FromStateId { get; set; }
    public int ToStateId { get; set; }

    public required string ActionTitle { get; set; }
    
    // 🌟 فیلد جدید برای مدیریت فعال/غیرفعال بودن دکمه‌ها در سازمان (Soft Delete/Deactivation)
    public bool IsActive { get; set; } = true;
    
    // 🌟 اصلاح استراتژیک: استفاده از کد ثابت (مثل INVENTORY_APPROVE) به جای نام کلاس
    // در لایه Application یک دکشنری این کدها را به کلاس‌های اجرایی مپ می‌کند
    public string? ActionCode { get; set; }
    
    public ICollection<BpmsTransitionRole> AllowedRoles { get; set; } = new List<BpmsTransitionRole>();
    public ICollection<BpmsTransitionRule> Rules { get; set; } = new List<BpmsTransitionRule>();

    public BpmsProcessVersion ProcessVersion { get; set; } = null!;
    public BpmsState FromState { get; set; } = null!;
    public BpmsState ToState { get; set; } = null!;
}