using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Configurations;

public class WarehouseConfiguration : IEntityTypeConfiguration<Warehouse>
{
    public void Configure(EntityTypeBuilder<Warehouse> builder)
    {
        builder.ToTable("Warehouses", "inventory");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Title).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Code).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Address).HasMaxLength(500);
        
        // کد انبار باید یکتا باشد
        builder.HasIndex(x => x.Code).IsUnique();

        // رابطه با لوکیشن‌ها: حذف انبار نباید لوکیشن‌های دارای دیتا را بپراند
        builder.HasMany(w => w.Locations)
               .WithOne(l => l.Warehouse)
               .HasForeignKey(l => l.WarehouseId)
               .OnDelete(DeleteBehavior.Restrict);

        // فقط کلید خارجی؛ انبار ناوبری به شرکت ندارد تا مدل انبار به اطلاعات پایه گره نخورد
        builder.HasOne<Company>()
               .WithMany()
               .HasForeignKey(x => x.CompanyId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}