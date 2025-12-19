using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.BaseInfo.Persistence.Configurations;

public class ProductUnitConversionConfiguration : IEntityTypeConfiguration<ProductUnitConversion>
{
    public void Configure(EntityTypeBuilder<ProductUnitConversion> builder)
    {
        builder.ToTable("product_unit_conversions", "base");

        // تنظیم دقت اعشار برای ضریب (مثلاً تا 6 رقم اعشار برای دقت بالا)
        builder.Property(c => c.Factor).HasPrecision(18, 6);

        builder.HasOne(c => c.AlternativeUnit)
               .WithMany()
               .HasForeignKey(c => c.AlternativeUnitId)
               .OnDelete(DeleteBehavior.Restrict);

        // قانون مهم: برای یک کالای خاص، یک واحد فرعی فقط یک بار تعریف شود
        builder.HasIndex(c => new { c.ProductId, c.AlternativeUnitId }).IsUnique();
    }
}