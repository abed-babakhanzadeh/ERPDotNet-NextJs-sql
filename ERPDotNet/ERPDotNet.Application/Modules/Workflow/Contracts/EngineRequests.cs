namespace ERPDotNet.Application.Modules.Workflow.Contracts;

public class StartProcessRequest
{
    public int CompanyId { get; set; }
    public required string ProcessCode { get; set; }
    public long TargetRecordId { get; set; }
    public required string UserId { get; set; }
    
    public Dictionary<string, object?> InitialVariables { get; set; } = new(); // 🌟
}

public class ExecuteTransitionRequest
{
    public long InstanceId { get; set; }
    public int TransitionId { get; set; }
    public required string UserId { get; set; }
    public string? Comment { get; set; }
    
    public Dictionary<string, object?>? ExtraVariables { get; set; } // 🌟
}