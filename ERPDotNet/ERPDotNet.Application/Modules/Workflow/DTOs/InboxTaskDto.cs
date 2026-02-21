namespace ERPDotNet.Application.Modules.Workflow.DTOs;

public class InboxTaskDto
{
    public long TaskId { get; set; }
    public long InstanceId { get; set; }
    public string ProcessCode { get; set; } = string.Empty;
    public string ProcessTitle { get; set; } = string.Empty;
    public string TaskTitle { get; set; } = string.Empty;
    public string StateTitle { get; set; } = string.Empty;
    public long TargetRecordId { get; set; }
    public DateTime CreatedAt { get; set; }
}