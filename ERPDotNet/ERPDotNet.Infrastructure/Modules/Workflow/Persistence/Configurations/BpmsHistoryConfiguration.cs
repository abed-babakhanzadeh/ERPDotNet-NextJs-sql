using ERPDotNet.Domain.Modules.Workflow.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Workflow.Persistence.Configurations;

public class BpmsHistoryConfiguration : IEntityTypeConfiguration<BpmsHistory>
{
    public void Configure(EntityTypeBuilder<BpmsHistory> builder)
    {
        builder.ToTable("BpmsHistories", "workflow");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ActionTitle).HasMaxLength(200).IsRequired();
        builder.Property(x => x.PerformedByUserId).HasMaxLength(450).IsRequired();
        builder.Property(x => x.Comment).HasMaxLength(1000);

        // ✨ ایندکس برای لود و مرتب‌سازی سریع تاریخچه یک پرونده بر اساس زمان
        // نکته: اگر در کلاس BaseEntity شما نام فیلد تاریخ ساخت متفاوت است (مثلاً CreatedAt)، نام آن را در خط زیر جایگزین کنید.
        builder.HasIndex(x => new { x.InstanceId, x.CreatedAt });

        builder.HasOne(x => x.Instance)
               .WithMany(x => x.Histories)
               .HasForeignKey(x => x.InstanceId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.FromState).WithMany().HasForeignKey(x => x.FromStateId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.ToState).WithMany().HasForeignKey(x => x.ToStateId).OnDelete(DeleteBehavior.Restrict);
    }
}