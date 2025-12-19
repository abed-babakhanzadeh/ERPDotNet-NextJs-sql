namespace ERPDotNet.Domain.Common;

public class AuditTrail
{
    public long Id { get; set; } // تغییر از int به long (bigint)
    
    public required string UserId { get; set; }
    public required string Type { get; set; }
    public required string TableName { get; set; }
    public DateTime DateTime { get; set; } = DateTime.UtcNow;
    
    public string? PrimaryKey { get; set; }
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public string? AffectedColumns { get; set; }
}