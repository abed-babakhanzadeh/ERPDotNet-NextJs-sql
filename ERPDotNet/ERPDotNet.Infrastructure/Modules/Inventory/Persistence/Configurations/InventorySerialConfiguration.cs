using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Configurations;

public class InventorySerialConfiguration : IEntityTypeConfiguration<InventorySerial>
{
    public void Configure(EntityTypeBuilder<InventorySerial> builder)
    {
        builder.ToTable("InventorySerials", "inventory");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.SerialNumber).HasMaxLength(100).IsRequired();

        // هر سریال برای هر کالا یکتاست
        builder.HasIndex(x => new { x.ProductId, x.SerialNumber }).IsUnique().HasFilter("[IsDeleted] = 0");
        builder.HasIndex(x => new { x.WarehouseId, x.ProductId, x.Status });

        builder.HasOne<ERPDotNet.Domain.Modules.BaseInfo.Entities.Product>()
               .WithMany()
               .HasForeignKey(x => x.ProductId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Warehouse)
               .WithMany()
               .HasForeignKey(x => x.WarehouseId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Location)
               .WithMany()
               .HasForeignKey(x => x.LocationId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
