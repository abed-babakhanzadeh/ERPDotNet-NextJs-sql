using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Configurations;

public class InventoryItemProfileConfiguration : IEntityTypeConfiguration<InventoryItemProfile>
{
    public void Configure(EntityTypeBuilder<InventoryItemProfile> builder)
    {
        builder.ToTable("InventoryItemProfiles", "inventory", b => b.IsTemporal()); // <--- جادوی Tier-0

        builder.HasKey(x => x.Id);

        // هر کالا فقط یک پروفایل انباری دارد
        builder.HasIndex(x => x.ProductId).IsUnique();

        // رابطه یک‌طرفه با Product (برای جلوگیری از وابستگی چرخشی و حذف آبشاری ناخواسته)
        builder.HasOne(x => x.Product)
               .WithOne()
               .HasForeignKey<InventoryItemProfile>(x => x.ProductId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.MainInventoryUnit)
               .WithMany()
               .HasForeignKey(x => x.MainInventoryUnitId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}