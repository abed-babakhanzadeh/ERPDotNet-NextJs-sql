using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Configurations;

public class InventoryDocHeaderConfiguration : IEntityTypeConfiguration<InventoryDocHeader>
{
    public void Configure(EntityTypeBuilder<InventoryDocHeader> builder)
    {
        builder.ToTable("InventoryDocHeaders", "inventory");

        builder.HasKey(x => x.Id);

        // ایندکس‌ها
        builder.HasIndex(x => x.DocNumber);
        builder.HasIndex(x => new { x.DocNumber, x.FiscalYearId });

        // پراپرتی‌ها
        builder.Property(x => x.ReferenceEntityName).HasMaxLength(100);
        builder.Property(x => x.ReferenceExternalCode).HasMaxLength(100);
        builder.Property(x => x.TargetPartyName).HasMaxLength(200);

        // روابط کلیدی (همه Restrict)
        builder.HasOne(x => x.DocType)
               .WithMany()
               .HasForeignKey(x => x.DocTypeId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Warehouse)
               .WithMany()
               .HasForeignKey(x => x.WarehouseId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.DestinationWarehouse)
               .WithMany()
               .HasForeignKey(x => x.DestinationWarehouseId)
               .OnDelete(DeleteBehavior.Restrict);

        // === اصلاح حیاتی: تعریف صریح رابطه با اقلام ===
        builder.HasMany(x => x.Details)
               .WithOne(x => x.Header)
               .HasForeignKey(x => x.HeaderId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}