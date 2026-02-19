// فایل: BpmsTransitionRuleConfiguration.cs
using ERPDotNet.Domain.Modules.Workflow.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Workflow.Persistence.Configurations;

public class BpmsTransitionRuleConfiguration : IEntityTypeConfiguration<BpmsTransitionRule>
{
    public void Configure(EntityTypeBuilder<BpmsTransitionRule> builder)
    {
        builder.ToTable("BpmsTransitionRules", "workflow");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.VariableName).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Operator).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Value).HasMaxLength(500).IsRequired();
        builder.HasOne(x => x.Transition).WithMany(x => x.Rules).HasForeignKey(x => x.TransitionId).OnDelete(DeleteBehavior.Cascade);
    }
}