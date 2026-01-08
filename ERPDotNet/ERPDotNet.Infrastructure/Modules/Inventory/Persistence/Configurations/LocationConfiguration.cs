using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Configurations;

public class LocationConfiguration : IEntityTypeConfiguration<Location>
{
    public void Configure(EntityTypeBuilder<Location> builder)
    {
        builder.HasKey(x => x.Id);

        // ایندکس روی ParentId (برای جوین‌ها)
        builder.HasIndex(x => x.ParentId);

        // === Tier-0 Performance ===
        // ایندکس روی Path برای جستجوی سریع زیرمجموعه‌ها (LIKE 'Root/%')
        builder.HasIndex(x => x.Path);
        
        // کد در هر انبار یکتاست
        builder.HasIndex(x => new { x.WarehouseId, x.Code }).IsUnique();

        builder.HasOne(x => x.Warehouse)
            .WithMany(w => w.Locations)
            .HasForeignKey(x => x.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict); // حذف انبار نباید آبشاری لوکیشن‌ها را پاک کند (امنیت)
    }
}