using ERPDotNet.Domain.Common;
using ERPDotNet.Domain.Modules.Workflow.Enums;

namespace ERPDotNet.Domain.Modules.Workflow.Entities;

public class BpmsState : BaseEntity
{
    public int Id { get; set; }
    public int ProcessVersionId { get; set; }
    
    public required string Title { get; set; }
    public required string StateCode { get; set; }
    public BpmsStateType Type { get; set; }

    public BpmsProcessVersion ProcessVersion { get; set; } = null!;
    public ICollection<BpmsTransition> OutgoingTransitions { get; set; } = new List<BpmsTransition>();
    public ICollection<BpmsTransition> IncomingTransitions { get; set; } = new List<BpmsTransition>();
}