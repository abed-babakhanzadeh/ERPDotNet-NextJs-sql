using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Configurations;

public class CurrentStockConfiguration : IEntityTypeConfiguration<CurrentStock>
{
    public void Configure(EntityTypeBuilder<CurrentStock> builder)
    {
        builder.ToTable("CurrentStocks", "inventory");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.QuantityOnHand).HasPrecision(18, 3);
        builder.Property(x => x.QuantityReserved).HasPrecision(18, 3);

        // ایندکس یونیک برای جلوگیری از تکرار موجودی یک ترکیب خاص
        // تضمین می‌کند که برای (انبار + کالا + لوکیشن + بچ) فقط یک رکورد موجودی داشته باشیم
        builder.HasIndex(x => new { x.WarehouseId, x.ProductId, x.LocationId, x.BatchId })
               .IsUnique();
    }
}