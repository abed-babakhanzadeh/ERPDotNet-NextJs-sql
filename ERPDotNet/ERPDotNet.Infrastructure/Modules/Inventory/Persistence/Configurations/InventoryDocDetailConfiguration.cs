using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Configurations;

public class InventoryDocDetailConfiguration : IEntityTypeConfiguration<InventoryDocDetail>
{
    public void Configure(EntityTypeBuilder<InventoryDocDetail> builder)
    {
        builder.ToTable("InventoryDocDetails", "inventory");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.MainUnitQuantity).HasPrecision(18, 3);
        builder.Property(x => x.SubUnitQuantity).HasPrecision(18, 3);

        // اگر هدر حذف شد (Draft)، اقلام هم حذف شوند
        builder.HasOne(x => x.Header)
               .WithMany(h => h.Details)
               .HasForeignKey(x => x.HeaderId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Location)
               .WithMany()
               .HasForeignKey(x => x.LocationId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.DestinationLocation)
               .WithMany()
               .HasForeignKey(x => x.DestinationLocationId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Batch)
               .WithMany()
               .HasForeignKey(x => x.BatchId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Serials)
               .WithOne(x => x.DocDetail)
               .HasForeignKey(x => x.DocDetailId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}

public class InventoryDocDetailSerialConfiguration : IEntityTypeConfiguration<InventoryDocDetailSerial>
{
    public void Configure(EntityTypeBuilder<InventoryDocDetailSerial> builder)
    {
        builder.ToTable("InventoryDocDetailSerials", "inventory");
        builder.Property(x => x.SerialNumber).HasMaxLength(100).IsRequired();
        builder.HasIndex(x => new { x.DocDetailId, x.SerialNumber }).IsUnique();
        builder.HasIndex(x => x.SerialNumber);
    }
}