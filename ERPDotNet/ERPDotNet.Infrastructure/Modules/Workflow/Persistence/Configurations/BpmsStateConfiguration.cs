using ERPDotNet.Domain.Modules.Workflow.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Workflow.Persistence.Configurations;

public class BpmsStateConfiguration : IEntityTypeConfiguration<BpmsState>
{
    public void Configure(EntityTypeBuilder<BpmsState> builder)
    {
        builder.ToTable("BpmsStates", "workflow");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Title).HasMaxLength(200).IsRequired();
        builder.Property(x => x.StateCode).HasMaxLength(100).IsRequired();

        builder.HasOne(x => x.ProcessVersion)
               .WithMany(x => x.States)
               .HasForeignKey(x => x.ProcessVersionId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}