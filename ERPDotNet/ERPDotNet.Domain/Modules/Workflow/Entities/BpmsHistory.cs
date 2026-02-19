using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.Workflow.Entities;

public class BpmsHistory : BaseEntity
{
    public long Id { get; set; }
    public long InstanceId { get; set; }
    
    public required string ActionTitle { get; set; }
    public int FromStateId { get; set; }
    public int ToStateId { get; set; }
    public required string PerformedByUserId { get; set; }
    public string? Comment { get; set; }

    public BpmsInstance Instance { get; set; } = null!;
    public BpmsState FromState { get; set; } = null!;
    public BpmsState ToState { get; set; } = null!;
}