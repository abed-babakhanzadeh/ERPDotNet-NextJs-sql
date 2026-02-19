using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.Workflow.Entities;

public class BpmsProcessVersion : BaseEntity
{
    public int Id { get; set; }
    public int ProcessId { get; set; }
    
    public int VersionNumber { get; set; }
    public bool IsActive { get; set; } 
    public string? DesignerJson { get; set; } 

    public BpmsProcess Process { get; set; } = null!;
    public ICollection<BpmsState> States { get; set; } = new List<BpmsState>();
    public ICollection<BpmsTransition> Transitions { get; set; } = new List<BpmsTransition>();
    public ICollection<BpmsInstance> Instances { get; set; } = new List<BpmsInstance>();
}