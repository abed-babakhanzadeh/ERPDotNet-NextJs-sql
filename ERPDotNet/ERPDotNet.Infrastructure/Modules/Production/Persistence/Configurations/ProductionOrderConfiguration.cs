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

        builder.HasMany(x => x.Operations)
               .WithOne(o => o.ProductionOrder)
               .HasForeignKey(o => o.ProductionOrderId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}

public class ProductionOrderOperationConfiguration : IEntityTypeConfiguration<ProductionOrderOperation>
{
    public void Configure(EntityTypeBuilder<ProductionOrderOperation> builder)
    {
        builder.ToTable("production_order_operations", "production");

        builder.Property(x => x.Title).HasMaxLength(100).IsRequired();
        builder.Property(x => x.PlannedSetupMinutes).HasPrecision(18, 4);
        builder.Property(x => x.PlannedRunMinutes).HasPrecision(18, 4);
        builder.HasIndex(x => new { x.ProductionOrderId, x.Sequence }).IsUnique();
        builder.HasOne(x => x.WorkCenter).WithMany().HasForeignKey(x => x.WorkCenterId).OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Reports)
               .WithOne(r => r.Operation)
               .HasForeignKey(r => r.ProductionOrderOperationId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}

public class ProductionOperationReportConfiguration : IEntityTypeConfiguration<ProductionOperationReport>
{
    public void Configure(EntityTypeBuilder<ProductionOperationReport> builder)
    {
        builder.ToTable("production_operation_reports", "production");

        builder.Property(x => x.GoodQuantity).HasPrecision(18, 6);
        builder.Property(x => x.ScrapQuantity).HasPrecision(18, 6);
        builder.Property(x => x.SetupMinutes).HasPrecision(18, 4);
        builder.Property(x => x.RunMinutes).HasPrecision(18, 4);
        builder.Property(x => x.HourlyRate).HasPrecision(18, 2);
        builder.Property(x => x.Note).HasMaxLength(500);
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

public class WorkCenterConfiguration : IEntityTypeConfiguration<WorkCenter>
{
    public void Configure(EntityTypeBuilder<WorkCenter> builder)
    {
        builder.ToTable("work_centers", "production");

        builder.Property(x => x.Code).HasMaxLength(20).IsRequired();
        builder.HasIndex(x => x.Code).IsUnique().HasFilter("[IsDeleted] = 0");
        builder.Property(x => x.Title).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(500);
        builder.Property(x => x.HoursPerDay).HasPrecision(5, 2);
        builder.Property(x => x.HourlyRate).HasPrecision(18, 2);

        builder.HasOne(x => x.CostCenter).WithMany().HasForeignKey(x => x.CostCenterId).OnDelete(DeleteBehavior.Restrict);
    }
}
