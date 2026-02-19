using ERPDotNet.Domain.Common;
using ERPDotNet.Domain.Modules.Workflow.Enums;
using ERPDotNet.Domain.Modules.Workflow.ValueObjects; // 🌟 اضافه شود

namespace ERPDotNet.Domain.Modules.Workflow.Entities;

public class BpmsInstance : BaseEntity
{
    public long Id { get; set; }
    public int CompanyId { get; set; }
    public int ProcessVersionId { get; set; }
    public long TargetRecordId { get; set; }
    public int CurrentStateId { get; set; }
    public BpmsInstanceStatus Status { get; set; }

    // 🌟 معماری 10/10 : استفاده از Value Object
    public ProcessVariables Variables { get; private set; } = new();

    public BpmsProcessVersion ProcessVersion { get; set; } = null!;
    public BpmsState CurrentState { get; set; } = null!;
    public ICollection<BpmsTask> Tasks { get; set; } = new List<BpmsTask>();
    public ICollection<BpmsHistory> Histories { get; set; } = new List<BpmsHistory>();
}