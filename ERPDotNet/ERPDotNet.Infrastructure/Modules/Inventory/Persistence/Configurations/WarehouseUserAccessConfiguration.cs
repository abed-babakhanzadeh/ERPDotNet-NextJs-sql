using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Configurations;

public class WarehouseUserAccessConfiguration : IEntityTypeConfiguration<WarehouseUserAccess>
{
    public void Configure(EntityTypeBuilder<WarehouseUserAccess> builder)
    {
        builder.ToTable("WarehouseUserAccesses", "inventory");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId).HasMaxLength(450).IsRequired();
        builder.HasIndex(x => new { x.UserId, x.WarehouseId }).IsUnique();

        builder.HasOne(x => x.Warehouse)
            .WithMany()
            .HasForeignKey(x => x.WarehouseId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
