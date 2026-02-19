using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.Workflow.Entities;

public class BpmsTransitionRole : BaseEntity
{
    public int Id { get; set; }
    public int TransitionId { get; set; }
    
    // آیدی Role در سیستم UserAccess
    public required string RoleId { get; set; } 

    public BpmsTransition Transition { get; set; } = null!;
}