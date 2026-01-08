using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Configurations;

public class ItemWarehouseSettingConfiguration : IEntityTypeConfiguration<ItemWarehouseSetting>
{
    public void Configure(EntityTypeBuilder<ItemWarehouseSetting> builder)
    {
        // تنظیمات Temporal Table
        builder.ToTable("ItemWarehouseSettings", "inventory", b => b.IsTemporal());

        builder.HasKey(x => x.Id);

        // ایندکس ترکیبی یکتا
        builder.HasIndex(x => new { x.WarehouseId, x.InventoryItemProfileId }).IsUnique();

        // تنظیم دقت فیلدهای اعشاری
        builder.Property(x => x.MinStock).HasPrecision(18, 3);
        builder.Property(x => x.MaxStock).HasPrecision(18, 3);
        builder.Property(x => x.ReorderPoint).HasPrecision(18, 3);

        // روابط
        builder.HasOne(x => x.Warehouse)
            .WithMany()
            .HasForeignKey(x => x.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        // === اصلاح اصلی اینجاست ===
        builder.HasOne(x => x.InventoryItemProfile)
            .WithMany(p => p.WarehouseSettings) // <--- حتماً باید نام کالکشن موجود در InventoryItemProfile را اینجا بیاورید
            .HasForeignKey(x => x.InventoryItemProfileId)
            .OnDelete(DeleteBehavior.Restrict);
            
        builder.HasOne(x => x.DefaultLocation)
            .WithMany()
            .HasForeignKey(x => x.DefaultLocationId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}