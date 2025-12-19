using ERPDotNet.Domain.Common;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using System.Text.Json;

namespace ERPDotNet.Infrastructure.Persistence.Interceptors;

public class AuditEntry
{
    public AuditEntry(EntityEntry entry)
    {
        Entry = entry;
    }

    public EntityEntry Entry { get; }
    
    // حل ارور CS8618: اجباری کردن فیلدها
    public required string UserId { get; set; }
    public required string TableName { get; set; }
    
    // حل ارور CS8601: تغییر object به object? چون دیتابیس نال هم دارد
    public Dictionary<string, object?> KeyValues { get; } = new();
    public Dictionary<string, object?> OldValues { get; } = new();
    public Dictionary<string, object?> NewValues { get; } = new();
    
    public List<string> ChangedColumns { get; } = new();
    
    // حل ارور CS8618: اجباری کردن
    public required string AuditType { get; set; } 

    public AuditTrail ToAuditTrail()
    {
        var audit = new AuditTrail
        {
            UserId = UserId,
            Type = AuditType,
            TableName = TableName,
            DateTime = DateTime.UtcNow,
            PrimaryKey = JsonSerializer.Serialize(KeyValues),
            OldValues = OldValues.Count == 0 ? null : JsonSerializer.Serialize(OldValues),
            NewValues = NewValues.Count == 0 ? null : JsonSerializer.Serialize(NewValues),
            AffectedColumns = ChangedColumns.Count == 0 ? null : JsonSerializer.Serialize(ChangedColumns)
        };
        return audit;
    }
}