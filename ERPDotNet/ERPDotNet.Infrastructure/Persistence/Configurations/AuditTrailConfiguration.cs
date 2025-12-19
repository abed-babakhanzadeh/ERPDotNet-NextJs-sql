using ERPDotNet.Domain.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Persistence.Configurations;

public class AuditTrailConfiguration : IEntityTypeConfiguration<AuditTrail>
{
    public void Configure(EntityTypeBuilder<AuditTrail> builder)
    {
        builder.ToTable("audit_trails", "audit");

        // تنظیم کلید اصلی (اما کلاستر نباشد)
        // چون برای پارتیشن‌بندی، کلاستر ایندکس باید شامل ستون تاریخ باشد
        builder.HasKey(x => x.Id).IsClustered(false);

        // تنظیمات فیلدها
        builder.Property(x => x.UserId).HasMaxLength(100).IsRequired();
        builder.Property(x => x.TableName).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Type).HasMaxLength(50).IsRequired();
        builder.Property(x => x.PrimaryKey).HasMaxLength(200);

        // در SQL Server نوع nvarchar(max) پیش‌فرض است که مناسب JSON می‌باشد
    }
}