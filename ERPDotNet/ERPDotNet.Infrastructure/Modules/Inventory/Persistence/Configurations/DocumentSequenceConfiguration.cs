using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Configurations;

public class DocumentSequenceConfiguration : IEntityTypeConfiguration<DocumentSequence>
{
    public void Configure(EntityTypeBuilder<DocumentSequence> builder)
    {
        // نام جدول و اسکیمای صحیح
        builder.ToTable("DocumentSequence", "inventory");

        // ✅ اصلاح مهم: کلید اصلی باید Id باشد (نه DocTypeId)
        builder.HasKey(x => x.Id);

        // ایندکس ترکیبی برای جلوگیری از تکرار
        // ایندکس روی (نوع سند + سال مالی) باید یکتا باشد
        // نکته: در SQL Server ایندکس Unique اجازه می‌دهد مقادیر Null هم یکتا باشند (یک رکورد با DocType=Null, Year=Null مجاز است)
        builder.HasIndex(x => new { x.DocTypeId, x.FiscalYearId })
               .IsUnique();

        // کانفیگ RowVersion برای کنترل همروندی (Optimistic Concurrency)
        builder.Property(x => x.RowVersion)
               .IsRowVersion();
    }
}