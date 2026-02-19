namespace ERPDotNet.Application.Modules.Workflow.Contracts;

public class BpmsActionContext
{
    public int CompanyId { get; set; }
    public long InstanceId { get; set; }
    public long TargetRecordId { get; set; }
    public string TargetEntityName { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;

    public Dictionary<string, object?> Variables { get; set; } = new(); // 🌟
}