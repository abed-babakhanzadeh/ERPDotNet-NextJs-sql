using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.ProductEngineering.Persistence.Configurations;

public class BOMConfiguration
{
    // کلاس‌ها را تو در تو ننوشتم تا خواناتر باشد، اما همه در یک فایل هستند
}

// 1. تنظیمات هدر (فرمول اصلی)
public class BOMHeaderConfiguration : IEntityTypeConfiguration<BOMHeader>
{
    public void Configure(EntityTypeBuilder<BOMHeader> builder)
    {
        builder.ToTable("bom_headers", "eng");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Title).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Version).HasMaxLength(20).IsRequired();
        // تنظیم همروندی
        builder.Property(x => x.RowVersion).IsRowVersion();

        // چالش ۴: جلوگیری از ثبت ورژن تکراری برای یک کالا
        // (نمی‌توانیم دو تا نسخه 1.0 برای کالای A داشته باشیم)
        builder.HasIndex(x => new { x.ProductId, x.Version }).IsUnique();

        // رابطه با محصول نهایی
        builder.HasOne(x => x.Product)
               .WithMany()
               .HasForeignKey(x => x.ProductId)
               .OnDelete(DeleteBehavior.Restrict); // اگر کالا BOM داشت، نباید کالا پاک شود

        // رابطه با جزئیات (اگر هدر پاک شد، جزئیاتش هم پاک شود چون بی‌معنی هستند)
        builder.HasMany(x => x.Details)
               .WithOne(x => x.BOMHeader)
               .HasForeignKey(x => x.BOMHeaderId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}

// 2. تنظیمات دیتیل (مواد اولیه)
public class BOMDetailConfiguration : IEntityTypeConfiguration<BOMDetail>
{
    public void Configure(EntityTypeBuilder<BOMDetail> builder)
    {
        builder.ToTable("bom_details", "eng");

        // چالش ۵: دقت بالا برای صنایع حساس (تا 6 رقم اعشار)
        builder.Property(x => x.Quantity).HasPrecision(18, 6);
        builder.Property(x => x.WastePercentage).HasPrecision(5, 2);
        builder.Property(x => x.InputQuantity).HasPrecision(18, 3);

        // چالش ۳: جلوگیری از افزودن تکراری یک ماده در یک فرمول
        // (مثلاً نمی‌شود سیم مسی را دو بار در یک لیست آورد، باید مقدارش را جمع زد)
        builder.HasIndex(x => new { x.BOMHeaderId, x.ChildProductId }).IsUnique();

        // چالش ۲: حفاظت از مواد اولیه
        // اگر "شکر" در فرمول کیک استفاده شده، نباید بتوانیم "شکر" را از لیست کالاها حذف کنیم
        builder.HasOne(x => x.ChildProduct)
               .WithMany()
               .HasForeignKey(x => x.ChildProductId)
               .OnDelete(DeleteBehavior.Restrict); 

        // رابطه با جایگزین‌ها (اگر سطر اصلی پاک شد، جایگزین‌هایش هم بروند)
        builder.HasMany(x => x.Substitutes)
               .WithOne(x => x.BOMDetail)
               .HasForeignKey(x => x.BOMDetailId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}

// 3. تنظیمات جایگزین‌ها
public class BOMSubstituteConfiguration : IEntityTypeConfiguration<BOMSubstitute>
{
    public void Configure(EntityTypeBuilder<BOMSubstitute> builder)
    {
        builder.ToTable("bom_substitutes", "eng");
        
        builder.Property(x => x.Factor).HasPrecision(18, 6);
        builder.Property(x => x.MaxMixPercentage).HasPrecision(5, 2);

        // جلوگیری از تکرار یک کالای جایگزین برای یک سطر خاص
        builder.HasIndex(x => new { x.BOMDetailId, x.SubstituteProductId }).IsUnique();

        // اگر کالایی به عنوان جایگزین استفاده شده، نباید از لیست کالاها حذف شود
        builder.HasOne(x => x.SubstituteProduct)
               .WithMany()
               .HasForeignKey(x => x.SubstituteProductId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}