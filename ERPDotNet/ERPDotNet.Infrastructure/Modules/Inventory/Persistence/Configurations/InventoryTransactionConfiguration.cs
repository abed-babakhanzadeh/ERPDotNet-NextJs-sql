using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Configurations;

public class InventoryTransactionConfiguration : IEntityTypeConfiguration<InventoryTransaction>
{
    public void Configure(EntityTypeBuilder<InventoryTransaction> builder)
    {
        builder.ToTable("InventoryTransactions", "inventory");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Quantity).HasPrecision(18, 3);
        builder.Property(x => x.UnitCost).HasPrecision(18, 6);
        builder.Property(x => x.TotalCost).HasPrecision(20, 4);

        // ایندکس 1: موجودی کالا در انبار (پرتکرارترین کوئری سیستم)
        builder.HasIndex(x => new { x.WarehouseId, x.ProductId });
        
        // ایندکس 2: فیلتر زمانی
        builder.HasIndex(x => x.TransactionDate);

        // ایندکس 3 (جدید - Diamond+): مخصوص گزارش کاردکس کالا
        // وقتی میگوییم "گردش کالای X را به ترتیب تاریخ بده"
        builder.HasIndex(x => new { x.ProductId, x.TransactionDate });

        // رابطه Self-Referencing برای اسناد اصلاحی/ابطالی
        builder.HasOne(x => x.RelatedTransaction)
               .WithMany()
               .HasForeignKey(x => x.RelatedTransactionId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}