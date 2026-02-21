using ERPDotNet.Domain.Modules.Workflow.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Workflow.Persistence.Configurations;

public class BpmsTaskConfiguration : IEntityTypeConfiguration<BpmsTask>
{
    public void Configure(EntityTypeBuilder<BpmsTask> builder)
    {
        builder.ToTable("BpmsTasks", "workflow");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Title).HasMaxLength(300).IsRequired();
        builder.Property(x => x.SummaryJson).HasColumnType("NVARCHAR(MAX)");
        builder.Property(x => x.AssigneeUserId).HasMaxLength(450);
        builder.Property(x => x.AssigneeRole).HasMaxLength(256);

        // ✨ کنترل هم‌روندی روی کارتابل (هیچ دو نفری نمی‌توانند همزمان یک تسکِ عمومی را به خود اختصاص دهند)
        builder.Property(x => x.RowVersion).IsRowVersion();

        // ایندکس طلایی کارتابل (Inbox)
        builder.HasIndex(x => new { x.CompanyId, x.AssigneeUserId, x.IsCompleted });

        builder.HasOne(x => x.Instance)
               .WithMany(x => x.Tasks)
               .HasForeignKey(x => x.InstanceId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.State)
               .WithMany()
               .HasForeignKey(x => x.StateId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
