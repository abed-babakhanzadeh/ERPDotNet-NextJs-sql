using ERPDotNet.Domain.Modules.Production.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Production.Persistence.Configurations;

public class ProductionOrderConfiguration : IEntityTypeConfiguration<ProductionOrder>
{
    public void Configure(EntityTypeBuilder<ProductionOrder> builder)
    {
        builder.ToTable("production_orders", "production");

        builder.Property(x => x.OrderNumber).HasMaxLength(20).IsRequired();
        builder.HasIndex(x => x.OrderNumber).IsUnique().HasFilter("[OrderNumber] <> ''");
        builder.Property(x => x.Quantity).HasPrecision(18, 6);
        builder.Property(x => x.Description).HasMaxLength(500);

        builder.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.BOMHeader).WithMany().HasForeignKey(x => x.BOMHeaderId).OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Materials)
               .WithOne(m => m.ProductionOrder)
               .HasForeignKey(m => m.ProductionOrderId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}

public class ProductionOrderMaterialConfiguration : IEntityTypeConfiguration<ProductionOrderMaterial>
{
    public void Configure(EntityTypeBuilder<ProductionOrderMaterial> builder)
    {
        builder.ToTable("production_order_materials", "production");

        builder.Property(x => x.StandardQuantity).HasPrecision(18, 6);
        builder.Property(x => x.WastePercentage).HasPrecision(5, 2);
        builder.Property(x => x.RequiredQuantity).HasPrecision(18, 6);
        builder.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
    }
}
