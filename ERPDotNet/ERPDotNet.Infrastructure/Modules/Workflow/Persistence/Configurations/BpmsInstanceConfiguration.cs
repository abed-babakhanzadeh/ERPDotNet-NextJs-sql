using ERPDotNet.Domain.Modules.Workflow.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Workflow.Persistence.Configurations;

public class BpmsInstanceConfiguration : IEntityTypeConfiguration<BpmsInstance>
{
    public void Configure(EntityTypeBuilder<BpmsInstance> builder)
    {
        builder.ToTable("BpmsInstances", "workflow");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.VariablesJson).HasColumnType("NVARCHAR(MAX)");

        // ✨ اعمال قطعی Concurrency Control برای جلوگیری از Race Condition
        // اگر دو نفر همزمان روی یک سند اقدام کنند، نفر دوم خطای DbUpdateConcurrencyException می‌گیرد
        builder.Property(x => x.RowVersion).IsRowVersion();

        // ایندکس‌های استراتژیک
        builder.HasIndex(x => new { x.CompanyId, x.TargetRecordId });
        
        // ✨ ایندکس جدید برای گزارش‌گیری سریع داشبورد مدیریت (اسناد بر اساس وضعیت)
        builder.HasIndex(x => new { x.CompanyId, x.CurrentStateId });

        builder.HasOne(x => x.CurrentState)
               .WithMany()
               .HasForeignKey(x => x.CurrentStateId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ProcessVersion)
               .WithMany(x => x.Instances)
               .HasForeignKey(x => x.ProcessVersionId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}