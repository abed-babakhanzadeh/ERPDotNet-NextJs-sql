using ERPDotNet.Domain.Modules.Workflow.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Workflow.Persistence.Configurations;

public class BpmsProcessVersionConfiguration : IEntityTypeConfiguration<BpmsProcessVersion>
{
    public void Configure(EntityTypeBuilder<BpmsProcessVersion> builder)
    {
        builder.ToTable("BpmsProcessVersions", "workflow");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.DesignerJson).HasColumnType("NVARCHAR(MAX)");

        builder.HasIndex(x => new { x.ProcessId, x.VersionNumber }).IsUnique();
        
        // ✨ ایندکس حیاتی برای یافتن سریع نسخه فعال در میان ده‌ها نسخه آرشیو شده
        builder.HasIndex(x => new { x.ProcessId, x.IsActive });
    }
}