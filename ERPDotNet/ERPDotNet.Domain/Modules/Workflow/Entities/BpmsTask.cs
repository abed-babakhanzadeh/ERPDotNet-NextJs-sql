using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.Workflow.Entities;

public class BpmsTask : BaseEntity
{
    public long Id { get; set; }
    
    // 🌟 برای امنیت کارتابل (که کاربر شرکت الف تسک شرکت ب را نبیند)
    public int CompanyId { get; set; }
    
    public long InstanceId { get; set; }
    public int StateId { get; set; }

    public required string Title { get; set; }
    public string? SummaryJson { get; set; }
    
    public string? AssigneeUserId { get; set; }
    public string? AssigneeRole { get; set; }
    
    // 🌟 تعیین مهلت انجام (Deadline) برای آلارم‌ها و SLA
    public DateTime? DueDate { get; set; }
    
    public bool IsCompleted { get; set; }
    public DateTime? CompletedDate { get; set; }

    public BpmsInstance Instance { get; set; } = null!;
    public BpmsState State { get; set; } = null!;
}