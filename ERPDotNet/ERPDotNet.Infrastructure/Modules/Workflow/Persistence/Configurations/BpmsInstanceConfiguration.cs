using System.Text.Json;
using ERPDotNet.Domain.Modules.Workflow.Entities;
using ERPDotNet.Domain.Modules.Workflow.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace ERPDotNet.Infrastructure.Modules.Workflow.Persistence.Configurations;

public class BpmsInstanceConfiguration : IEntityTypeConfiguration<BpmsInstance>
{
    public void Configure(EntityTypeBuilder<BpmsInstance> builder)
    {
        builder.ToTable("BpmsInstances", "workflow");
        builder.HasKey(x => x.Id);

        // 🌟 نگاشت Value Object به JSON
        var converter = new ValueConverter<ProcessVariables, string>(
            v => SerializeDeterministically(v),
            v => DeserializeVariables(v)
        );

        // 🌟 مقایسه‌گر قطعی (Deterministic): فقط در صورت تغییر واقعی متغیرها، آپدیت دیتابیس رخ می‌دهد
        var comparer = new ValueComparer<ProcessVariables>(
            (c1, c2) => SerializeDeterministically(c1) == SerializeDeterministically(c2),
            c => c == null ? 0 : SerializeDeterministically(c).GetHashCode(),
            c => DeserializeVariables(SerializeDeterministically(c)) // Snapshot
        );

        builder.Property(x => x.Variables)
               .HasConversion(converter, comparer)
               .HasColumnName("VariablesJson")
               .HasColumnType("NVARCHAR(MAX)");

        builder.Property(x => x.RowVersion).IsRowVersion();

        builder.HasIndex(x => new { x.CompanyId, x.TargetRecordId });
        builder.HasIndex(x => new { x.CompanyId, x.CurrentStateId });

        builder.HasOne(x => x.CurrentState).WithMany().HasForeignKey(x => x.CurrentStateId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.ProcessVersion).WithMany().HasForeignKey(x => x.ProcessVersionId).OnDelete(DeleteBehavior.Restrict);
    }

    // === متدهای کمکی برای تبدیل قطعی و ایمن ===

    private static string SerializeDeterministically(ProcessVariables? variables)
    {
        if (variables == null || !variables.Data.Any()) return "{}";
        
        // 🌟 مرتب‌سازی کلیدها (Order By Key) برای ایجاد یک رشته قطعی از JSON
        var ordered = variables.Data.OrderBy(k => k.Key).ToDictionary(k => k.Key, k => k.Value);
        return JsonSerializer.Serialize(ordered, (JsonSerializerOptions?)null);
    }

    private static ProcessVariables DeserializeVariables(string json)
    {
        var result = new ProcessVariables();
        if (string.IsNullOrWhiteSpace(json)) return result;
        
        try
        {
            var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);
            if (dict == null) return result;

            var parsedDict = new Dictionary<string, object?>();
            foreach (var kvp in dict) parsedDict[kvp.Key] = ConvertElement(kvp.Value);
            
            result.SetVariables(parsedDict);
            return result;
        }
        catch { return result; }
    }

    private static object? ConvertElement(JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Number:
                if (element.TryGetInt64(out long l)) return l;
                if (element.TryGetDecimal(out decimal d)) return d;
                return element.GetDouble();
            case JsonValueKind.True: return true;
            case JsonValueKind.False: return false;
            case JsonValueKind.String:
                if (element.TryGetDateTime(out DateTime dt)) return dt;
                return element.GetString();
            case JsonValueKind.Null: return null; 
            default: return element.GetRawText();
        }
    }
}