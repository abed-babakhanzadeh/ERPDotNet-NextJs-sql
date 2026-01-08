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

        builder.HasOne(x => x.Batch)
               .WithMany()
               .HasForeignKey(x => x.BatchId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}