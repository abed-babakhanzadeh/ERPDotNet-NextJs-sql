using ERPDotNet.Domain.Modules.Workflow.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Workflow.Persistence.Configurations;

public class BpmsDelegationConfiguration : IEntityTypeConfiguration<BpmsDelegation>
{
    public void Configure(EntityTypeBuilder<BpmsDelegation> builder)
    {
        builder.ToTable("BpmsDelegations", "workflow");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.FromUserId).HasMaxLength(450).IsRequired();
        builder.Property(x => x.ToUserId).HasMaxLength(450).IsRequired();
        builder.Property(x => x.Reason).HasMaxLength(500);

        // جستجوی تفویض‌های فعال گیرنده در هر بار باز کردن کارتابل
        builder.HasIndex(x => new { x.ToUserId, x.EndDate });
    }
}
