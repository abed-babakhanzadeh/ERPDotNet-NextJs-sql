using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Configurations;

public class InventoryDocTypeConfiguration : IEntityTypeConfiguration<InventoryDocType>
{
    public void Configure(EntityTypeBuilder<InventoryDocType> builder)
    {
        builder.ToTable("InventoryDocTypes", "inventory");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Title).HasMaxLength(100).IsRequired();

        // رابطه پدر-فرزندی
        builder.HasOne(x => x.Parent)
               .WithMany(x => x.Children)
               .HasForeignKey(x => x.ParentId)
               .OnDelete(DeleteBehavior.Restrict);

        // جدول فرزند (Allowed References) به صورت Cascade حذف شود
        builder.HasMany(x => x.AllowedReferences)
               .WithOne()
               .HasForeignKey(r => r.InventoryDocTypeId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}

public class InventoryDocTypeAllowedRefConfiguration : IEntityTypeConfiguration<InventoryDocTypeAllowedRef>
{
    public void Configure(EntityTypeBuilder<InventoryDocTypeAllowedRef> builder)
    {
        builder.ToTable("InventoryDocTypeAllowedRefs", "inventory");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.ReferenceEntityName).HasMaxLength(100).IsRequired();
    }
}