using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.BaseInfo.Persistence.Configurations;

public class ProductAttributeConfiguration : IEntityTypeConfiguration<ProductAttribute>
{
    public void Configure(EntityTypeBuilder<ProductAttribute> builder)
    {
        builder.ToTable("product_attributes", "base");

        builder.Property(x => x.Code).HasMaxLength(20).IsRequired();
        builder.Property(x => x.Title).HasMaxLength(100).IsRequired();
        builder.HasIndex(x => x.Code).IsUnique().HasFilter("[IsDeleted] = 0");

        builder.HasMany(x => x.Values)
               .WithOne(v => v.Attribute)
               .HasForeignKey(v => v.AttributeId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}

public class ProductAttributeValueConfiguration : IEntityTypeConfiguration<ProductAttributeValue>
{
    public void Configure(EntityTypeBuilder<ProductAttributeValue> builder)
    {
        builder.ToTable("product_attribute_values", "base");

        builder.Property(x => x.Code).HasMaxLength(20).IsRequired();
        builder.Property(x => x.Title).HasMaxLength(100).IsRequired();
        builder.HasIndex(x => new { x.AttributeId, x.Code }).IsUnique();
    }
}

public class ProductVariantValueConfiguration : IEntityTypeConfiguration<ProductVariantValue>
{
    public void Configure(EntityTypeBuilder<ProductVariantValue> builder)
    {
        builder.ToTable("product_variant_values", "base");

        builder.HasIndex(x => new { x.ProductId, x.AttributeValueId }).IsUnique();

        builder.HasOne(x => x.Product)
               .WithMany(p => p.VariantValues)
               .HasForeignKey(x => x.ProductId)
               .OnDelete(DeleteBehavior.Cascade);

        // مقدار استفاده‌شده در تنوع حذف نمی‌شود
        builder.HasOne(x => x.AttributeValue)
               .WithMany()
               .HasForeignKey(x => x.AttributeValueId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
