using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.Workflow.Entities;

public class BpmsProcess : BaseEntity
{
    public int Id { get; set; }
    
    // 🌟 فیلد حیاتی برای سیستم‌های چند شرکتی (Multi-Tenant)
    public int CompanyId { get; set; }
    
    public required string ProcessCode { get; set; } 
    public required string Title { get; set; }
    public required string TargetEntityName { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<BpmsProcessVersion> Versions { get; set; } = new List<BpmsProcessVersion>();
}