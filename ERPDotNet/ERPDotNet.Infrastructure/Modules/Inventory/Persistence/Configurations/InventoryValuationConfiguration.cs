using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Configurations;

public class InventoryCostBalanceConfiguration : IEntityTypeConfiguration<InventoryCostBalance>
{
    public void Configure(EntityTypeBuilder<InventoryCostBalance> builder)
    {
        builder.ToTable("inventory_cost_balances", "inventory");

        builder.Property(x => x.Quantity).HasPrecision(18, 3);
        builder.Property(x => x.Value).HasPrecision(20, 4);
        builder.Ignore(x => x.AverageCost);

        // EF به‌طور پیش‌فرض ستون‌های nullable را از ایندکس یکتا فیلتر می‌کند؛ بدون فیلتر، SQL Server دو NULL را
        // برابر می‌داند و تراز سطح «شرکت» (انبار خالی) و «بدون شرکت» هم یکتا می‌ماند
        builder.HasIndex(x => new { x.CompanyId, x.ProductId, x.WarehouseId }).IsUnique().HasFilter(null);

        builder.HasOne<ERPDotNet.Domain.Modules.BaseInfo.Entities.Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Warehouse>().WithMany().HasForeignKey(x => x.WarehouseId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class InventoryValuationSettingsConfiguration : IEntityTypeConfiguration<InventoryValuationSettings>
{
    public void Configure(EntityTypeBuilder<InventoryValuationSettings> builder)
    {
        builder.ToTable("valuation_settings", "inventory");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.HasData(new InventoryValuationSettings { Id = InventoryValuationSettings.SingletonId, CreatedAt = new DateTime(2026, 10, 26, 0, 0, 0, DateTimeKind.Utc) });
    }
}
