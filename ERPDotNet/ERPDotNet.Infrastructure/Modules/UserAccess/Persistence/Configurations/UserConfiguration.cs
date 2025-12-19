using ERPDotNet.Domain.Modules.UserAccess.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.UserAccess.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        // 1. نام جدول
        builder.ToTable("users", "security");

        // 2. تنظیمات فیلدها
        builder.Property(e => e.FirstName).HasMaxLength(50).IsRequired();
        builder.Property(e => e.LastName).HasMaxLength(50).IsRequired();
        
        // 3. ایندکس‌ها
        builder.HasIndex(e => e.NationalCode).IsUnique();

        // 4. (جدید) ارتباط با جدول UserPermission
        // اگر یوزر حذف شد، پرمیشن‌های اختصاصی‌اش هم پاک شود
        builder.HasMany<UserPermission>()
               .WithOne(up => up.User)
               .HasForeignKey(up => up.UserId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}