using ERPDotNet.Domain.Modules.Workflow.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Workflow.Persistence.Configurations;

public class BpmsProcessConfiguration : IEntityTypeConfiguration<BpmsProcess>
{
    public void Configure(EntityTypeBuilder<BpmsProcess> builder)
    {
        builder.ToTable("BpmsProcesses", "workflow");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ProcessCode).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Title).HasMaxLength(200).IsRequired();
        builder.Property(x => x.TargetEntityName).HasMaxLength(100).IsRequired();

        // 🌟 ایندکس برای جستجوی سریع فرآیندها در هر شرکت
        builder.HasIndex(x => new { x.CompanyId, x.ProcessCode }).IsUnique();
        
        builder.HasMany(x => x.Versions)
               .WithOne(x => x.Process)
               .HasForeignKey(x => x.ProcessId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}