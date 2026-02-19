using System.Text.Json;
using ERPDotNet.Domain.Common;
using ERPDotNet.Domain.Modules.Workflow.Enums;

namespace ERPDotNet.Domain.Modules.Workflow.Entities;

public class BpmsInstance : BaseEntity
{
    public long Id { get; set; }
    
    // 🌟 تفکیک دیتای نمونه‌های در حال اجرا بر اساس شرکت
    public int CompanyId { get; set; }
    
    public int ProcessVersionId { get; set; }
    public long TargetRecordId { get; set; }
    public int CurrentStateId { get; set; }
    public BpmsInstanceStatus Status { get; set; }

    public string? VariablesJson { get; private set; }

    public void SetVariable(string key, string value)
    {
        var dict = string.IsNullOrEmpty(VariablesJson) 
            ? new Dictionary<string, string>() 
            : JsonSerializer.Deserialize<Dictionary<string, string>>(VariablesJson) ?? new Dictionary<string, string>();
            
        dict[key] = value;
        VariablesJson = JsonSerializer.Serialize(dict);
    }

    public string? GetVariable(string key)
    {
        if (string.IsNullOrEmpty(VariablesJson)) return null;
        var dict = JsonSerializer.Deserialize<Dictionary<string, string>>(VariablesJson);
        return dict != null && dict.TryGetValue(key, out var val) ? val : null;
    }

    public BpmsProcessVersion ProcessVersion { get; set; } = null!;
    public BpmsState CurrentState { get; set; } = null!;
    public ICollection<BpmsTask> Tasks { get; set; } = new List<BpmsTask>();
    public ICollection<BpmsHistory> Histories { get; set; } = new List<BpmsHistory>();
}