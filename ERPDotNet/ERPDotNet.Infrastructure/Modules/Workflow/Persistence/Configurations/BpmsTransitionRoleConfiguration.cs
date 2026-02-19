// فایل: BpmsTransitionRoleConfiguration.cs
using ERPDotNet.Domain.Modules.Workflow.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Workflow.Persistence.Configurations;

public class BpmsTransitionRoleConfiguration : IEntityTypeConfiguration<BpmsTransitionRole>
{
    public void Configure(EntityTypeBuilder<BpmsTransitionRole> builder)
    {
        builder.ToTable("BpmsTransitionRoles", "workflow");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.RoleId).HasMaxLength(450).IsRequired(); // سایز پیش‌فرض آیدی Identity
        builder.HasOne(x => x.Transition).WithMany(x => x.AllowedRoles).HasForeignKey(x => x.TransitionId).OnDelete(DeleteBehavior.Cascade);
    }
}