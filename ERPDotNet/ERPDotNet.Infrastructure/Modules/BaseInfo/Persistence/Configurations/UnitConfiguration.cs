using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.BaseInfo.Persistence.Configurations;

public class UnitConfiguration : IEntityTypeConfiguration<Unit>
{
    public void Configure(EntityTypeBuilder<Unit> builder)
    {
        builder.ToTable("units", "base"); // اسکیمای جداگانه برای اطلاعات پایه

        builder.Property(x => x.Title).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Symbol).HasMaxLength(10);
        builder.Property(x => x.ConversionFactor).HasPrecision(18, 6);
        
        builder.HasOne(x => x.BaseUnit)
       .WithMany()
       .HasForeignKey(x => x.BaseUnitId)
       .OnDelete(DeleteBehavior.Restrict);
        // این خط باعث می‌شود دیتابیس ماژولار بماند و با Identity قاطی نشود
    }
}