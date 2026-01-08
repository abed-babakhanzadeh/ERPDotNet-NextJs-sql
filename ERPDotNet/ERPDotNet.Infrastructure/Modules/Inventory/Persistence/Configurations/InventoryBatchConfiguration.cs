using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Configurations;

public class InventoryBatchConfiguration : IEntityTypeConfiguration<InventoryBatch>
{
    public void Configure(EntityTypeBuilder<InventoryBatch> builder)
    {
        builder.ToTable("InventoryBatches", "inventory");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.BatchNumber).HasMaxLength(50).IsRequired();
        builder.Property(x => x.BlockReason).HasMaxLength(200);

        // شماره بچ برای هر محصول باید یکتا باشد
        builder.HasIndex(x => new { x.ProductId, x.BatchNumber }).IsUnique();
    }
}