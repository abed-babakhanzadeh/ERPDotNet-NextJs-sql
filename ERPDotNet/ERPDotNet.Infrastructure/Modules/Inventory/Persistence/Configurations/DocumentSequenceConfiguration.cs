using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Configurations;

public class DocumentSequenceConfiguration : IEntityTypeConfiguration<DocumentSequence>
{
    public void Configure(EntityTypeBuilder<DocumentSequence> builder)
    {
        builder.HasKey(x => x.Id);

        // ترکیب (نوع سند + سال مالی) باید یکتا باشد
        // این یعنی برای "رسید خرید 1403" فقط یک شمارنده داریم
        builder.HasIndex(x => new { x.DocTypeId, x.FiscalYearId }).IsUnique();
        
        // تنظیمات همروندی (خودکار توسط BaseEntity و [Timestamp] هندل می‌شود ولی اینجا هم تاکید می‌کنیم)
        builder.Property(x => x.RowVersion).IsRowVersion();
    }
}