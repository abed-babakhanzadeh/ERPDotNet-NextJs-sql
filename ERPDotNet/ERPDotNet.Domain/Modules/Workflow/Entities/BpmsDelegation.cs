using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.Workflow.Entities;

// تفویض اختیار کارتابل: در بازه تعیین‌شده، گیرنده با نقش‌های تفویض‌کننده روی پرونده‌ها اقدام می‌کند
public class BpmsDelegation : BaseEntity
{
    public int Id { get; set; }
    public int CompanyId { get; set; }

    public required string FromUserId { get; set; }
    public required string ToUserId { get; set; }

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Reason { get; set; }

    // لغو پیش از پایان بازه
    public bool IsRevoked { get; set; }
}
