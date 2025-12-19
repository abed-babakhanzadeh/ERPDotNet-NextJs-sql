using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.BaseInfo.Persistence.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("products", "base");

        builder.Property(p => p.Code).HasMaxLength(50).IsRequired();
        builder.Property(p => p.Name).HasMaxLength(200).IsRequired();
        builder.HasIndex(p => p.Code).IsUnique();

        // رابطه با واحد اصلی
        builder.HasOne(p => p.Unit)      // تغییر از BaseUnit به Unit
               .WithMany()
               .HasForeignKey(p => p.UnitId) // تغییر از BaseUnitId به UnitId
               .OnDelete(DeleteBehavior.Restrict);
        
        // رابطه با تبدیل‌ها (Cascade Delete: اگر کالا پاک شد، تبدیل‌هایش هم پاک شود)
        builder.HasMany(p => p.UnitConversions)
               .WithOne(c => c.Product)
               .HasForeignKey(c => c.ProductId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}