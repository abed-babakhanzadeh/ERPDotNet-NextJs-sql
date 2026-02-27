namespace ERPDotNet.Application.Modules.Workflow.DTOs;

public class ProcessDto
{
    public int Id { get; set; }
    public string ProcessCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string TargetEntityName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int ActiveVersionId { get; set; }
    public int ActiveVersionNumber { get; set; }
}