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

    // مهلت انجام کار این مرحله (ساعت)؛ خالی یعنی بدون سررسید
    public int? SlaHours { get; set; }

    // نقشی که پس از گذشتن سررسید، علاوه بر نقش‌های مجاز دکمه‌ها، می‌تواند روی پرونده اقدام کند
    public string? EscalationRoleId { get; set; }

    public BpmsProcessVersion ProcessVersion { get; set; } = null!;
    public ICollection<BpmsTransition> OutgoingTransitions { get; set; } = new List<BpmsTransition>();
    public ICollection<BpmsTransition> IncomingTransitions { get; set; } = new List<BpmsTransition>();
}