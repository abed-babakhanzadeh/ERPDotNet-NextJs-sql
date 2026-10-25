using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.BaseInfo.Persistence.Configurations;

public class CompanyConfiguration : IEntityTypeConfiguration<Company>
{
    public void Configure(EntityTypeBuilder<Company> builder)
    {
        builder.ToTable("companies", "base");

        builder.Property(x => x.Code).HasMaxLength(20).IsRequired();
        builder.Property(x => x.Title).HasMaxLength(200).IsRequired();
        builder.Property(x => x.NationalId).HasMaxLength(11);
        builder.Property(x => x.EconomicCode).HasMaxLength(14);
        builder.Property(x => x.RegistrationNumber).HasMaxLength(20);
        builder.Property(x => x.Phone).HasMaxLength(30);
        builder.Property(x => x.Address).HasMaxLength(500);

        // رکورد حذف‌شده (نرم) نباید جلوی تعریف دوباره همان کد را بگیرد
        builder.HasIndex(x => x.Code).IsUnique().HasFilter("[IsDeleted] = 0");
    }
}
