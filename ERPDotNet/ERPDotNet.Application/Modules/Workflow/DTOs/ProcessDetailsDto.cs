namespace ERPDotNet.Application.Modules.Workflow.DTOs;

public class StateDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string StateCode { get; set; } = string.Empty;
    public int Type { get; set; } // 1: Start, 2: Intermediate, 3: End
}

public class TransitionDto
{
    public int Id { get; set; }
    public int FromStateId { get; set; }
    public string FromStateTitle { get; set; } = string.Empty;
    public int ToStateId { get; set; }
    public string ToStateTitle { get; set; } = string.Empty;
    public string ActionTitle { get; set; } = string.Empty;
    public string? ActionCode { get; set; }
    public bool IsActive { get; set; }
}

// این کلاس کل درخت فرآیند را یکجا برای فرانت‌اند می‌فرستد
public class ProcessDetailsDto : ProcessDto
{
    public List<StateDto> States { get; set; } = new();
    public List<TransitionDto> Transitions { get; set; } = new();
}