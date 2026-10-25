using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Configurations;

public class StockCountConfiguration : IEntityTypeConfiguration<StockCount>
{
    public void Configure(EntityTypeBuilder<StockCount> builder)
    {
        builder.ToTable("StockCounts", "inventory");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Description).HasMaxLength(500);
        builder.HasIndex(x => new { x.WarehouseId, x.Status });

        builder.HasOne(x => x.Warehouse)
               .WithMany()
               .HasForeignKey(x => x.WarehouseId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Lines)
               .WithOne(x => x.StockCount)
               .HasForeignKey(x => x.StockCountId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}

public class StockCountLineConfiguration : IEntityTypeConfiguration<StockCountLine>
{
    public void Configure(EntityTypeBuilder<StockCountLine> builder)
    {
        builder.ToTable("StockCountLines", "inventory");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.SystemQuantity).HasPrecision(18, 3);
        builder.Property(x => x.CountedQuantity).HasPrecision(18, 3);

        builder.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Location).WithMany().HasForeignKey(x => x.LocationId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Batch).WithMany().HasForeignKey(x => x.BatchId).OnDelete(DeleteBehavior.Restrict);
    }
}
