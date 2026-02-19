using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.Workflow.Entities;

public class BpmsTransitionRule : BaseEntity
{
    public int Id { get; set; }
    public int TransitionId { get; set; }
    
    public required string VariableName { get; set; } // مثلا Amount
    public required string Operator { get; set; }     // مثلا > یا ==
    public required string Value { get; set; }        // مثلا 100000

    public BpmsTransition Transition { get; set; } = null!;
}