using ERPDotNet.Domain.Modules.Workflow.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Workflow.Persistence.Configurations;

public class BpmsTransitionConfiguration : IEntityTypeConfiguration<BpmsTransition>
{
    public void Configure(EntityTypeBuilder<BpmsTransition> builder)
    {
        builder.ToTable("BpmsTransitions", "workflow");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ActionTitle).HasMaxLength(200).IsRequired();
        builder.Property(x => x.ActionCode).HasMaxLength(100);

        // ✨ ایندکس روی ActionCode
        builder.HasIndex(x => x.ActionCode);

        builder.HasOne(x => x.FromState)
               .WithMany(x => x.OutgoingTransitions)
               .HasForeignKey(x => x.FromStateId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ToState)
               .WithMany(x => x.IncomingTransitions)
               .HasForeignKey(x => x.ToStateId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ProcessVersion)
               .WithMany(x => x.Transitions)
               .HasForeignKey(x => x.ProcessVersionId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}