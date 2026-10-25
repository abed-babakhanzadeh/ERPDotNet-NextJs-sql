using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.BaseInfo.Persistence.Configurations;

public class FiscalYearConfiguration : IEntityTypeConfiguration<FiscalYear>
{
    public void Configure(EntityTypeBuilder<FiscalYear> builder)
    {
        builder.ToTable("fiscal_years", "base");

        builder.Property(x => x.Title).HasMaxLength(50).IsRequired();

        builder.HasOne(x => x.Company)
               .WithMany()
               .HasForeignKey(x => x.CompanyId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.CompanyId, x.Title }).IsUnique().HasFilter("[IsDeleted] = 0");
        builder.HasIndex(x => new { x.CompanyId, x.StartDate });
    }
}
