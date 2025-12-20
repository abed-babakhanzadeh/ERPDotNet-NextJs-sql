using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Domain.Common;

public abstract class BaseEntity
{
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // طول رشته در کانفیگ محدود شود (مثلا 50 کاراکتر)
    public string? CreatedBy { get; set; } 

    public DateTime? LastModifiedAt { get; set; }
    public string? LastModifiedBy { get; set; }

    public bool IsDeleted { get; set; } = false;

    // === افزودن این خط برای کنترل همروندی ===
    // این فیلد را خود SQL Server پر می‌کند و تغییر می‌دهد.
    // در سی‌شارپ به صورت byte[] مپ می‌شود.
    [Timestamp]
    public byte[]? RowVersion { get; set; } 
}
