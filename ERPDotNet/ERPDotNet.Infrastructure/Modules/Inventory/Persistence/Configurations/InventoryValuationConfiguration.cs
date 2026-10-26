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

public class InventoryCostLayerConfiguration : IEntityTypeConfiguration<InventoryCostLayer>
{
    public void Configure(EntityTypeBuilder<InventoryCostLayer> builder)
    {
        builder.ToTable("inventory_cost_layers", "inventory");

        builder.Property(x => x.UnitCost).HasPrecision(18, 6);
        builder.Property(x => x.OriginalQuantity).HasPrecision(18, 3);
        builder.Property(x => x.RemainingQuantity).HasPrecision(18, 3);

        // لایه‌های باز یک دامنه به ترتیب ساخت خوانده می‌شوند
        builder.HasIndex(x => new { x.ProductId, x.CompanyId, x.WarehouseId, x.RemainingQuantity });

        builder.HasOne(x => x.SourceTransaction).WithMany().HasForeignKey(x => x.SourceTransactionId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<ERPDotNet.Domain.Modules.BaseInfo.Entities.Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Warehouse>().WithMany().HasForeignKey(x => x.WarehouseId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class InventoryCostLayerConsumptionConfiguration : IEntityTypeConfiguration<InventoryCostLayerConsumption>
{
    public void Configure(EntityTypeBuilder<InventoryCostLayerConsumption> builder)
    {
        builder.ToTable("inventory_cost_layer_consumptions", "inventory");

        builder.Property(x => x.Quantity).HasPrecision(18, 3);
        builder.Property(x => x.Cost).HasPrecision(20, 4);

        builder.HasOne(x => x.Layer).WithMany().HasForeignKey(x => x.LayerId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Transaction).WithMany().HasForeignKey(x => x.TransactionId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(x => x.TransactionId);
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
