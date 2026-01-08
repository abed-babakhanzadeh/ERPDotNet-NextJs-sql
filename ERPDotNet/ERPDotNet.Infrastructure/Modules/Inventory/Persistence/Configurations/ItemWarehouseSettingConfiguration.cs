using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Configurations;

public class ItemWarehouseSettingConfiguration : IEntityTypeConfiguration<ItemWarehouseSetting>
{
    public void Configure(EntityTypeBuilder<ItemWarehouseSetting> builder)
    {
        builder.ToTable("ItemWarehouseSettings", "inventory");

        builder.HasKey(x => x.Id);

        // تنظیم دقت اعشار
        builder.Property(x => x.MinStock).HasPrecision(18, 3);
        builder.Property(x => x.MaxStock).HasPrecision(18, 3);
        builder.Property(x => x.ReorderPoint).HasPrecision(18, 3);

        // یک کالا در یک انبار فقط یک تنظیمات دارد
        builder.HasIndex(x => new { x.InventoryItemProfileId, x.WarehouseId }).IsUnique();

        // اگر انبار حذف شد، تنظیماتش هم پاک شود (چون دیتا نیست، کانفیگ است)
        builder.HasOne(x => x.Warehouse)
               .WithMany()
               .HasForeignKey(x => x.WarehouseId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}