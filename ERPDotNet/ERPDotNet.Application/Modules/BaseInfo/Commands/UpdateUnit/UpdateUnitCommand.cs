using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.UpdateUnit;

[CacheInvalidation("Units", "UnitsLookup")] // کش‌های مرتبط را می‌پراند
public record UpdateUnitCommand : IRequest<bool>
{
    public int Id { get; set; } // شناسه برای پیدا کردن رکورد
    public required string Title { get; set; }
    public required string Symbol { get; set; }
    public int Precision { get; set; }
    public bool IsActive { get; set; } // امکان غیرفعال کردن واحد

    // فیلدهای واحد فرعی
    public int? BaseUnitId { get; set; }
    public decimal? ConversionFactor { get; set; }
    // === فیلد جدید: ورژن ردیف ===
    // این فیلد باید از سمت کلاینت (فرانت) ارسال شود (همانی که موقع Get خوانده شده)
    public byte[]? RowVersion { get; set; }
}

public class UpdateUnitValidator : AbstractValidator<UpdateUnitCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateUnitValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(x => x.Id).GreaterThan(0);

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("عنوان واحد الزامی است.")
            .MustAsync(async (model, title, token) => 
            {
                // چک کردن تکراری نبودن (غیر از خودش)
                return !await _context.Units.AnyAsync(u => u.Title == title && u.Id != model.Id, token);
            })
            .WithMessage("این عنوان واحد قبلاً برای واحد دیگری ثبت شده است.");

        // جلوگیری از انتخاب خودش به عنوان واحد پایه
        RuleFor(x => x.BaseUnitId)
            .NotEqual(x => x.Id).WithMessage("یک واحد نمی‌تواند زیرمجموعه خودش باشد.");
            
        // (پیشرفته) اینجا می‌توان یک متد برای چک کردن Circular Dependency هم نوشت
    }
}

public class UpdateUnitHandler : IRequestHandler<UpdateUnitCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateUnitHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateUnitCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Units
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (entity == null) return false; // یا پرتاب NotFoundException

        // === لاجیک کنترل همروندی (Optimistic Concurrency) ===
        if (request.RowVersion != null && request.RowVersion.Length > 0)
        {
            // به EF می‌گوییم: "مقدار اورجینال این فیلد در دیتابیس، باید این چیزی باشد که من می‌گویم"
            // اگر در دیتابیس تغییر کرده باشد، یعنی کس دیگری دست زده و SaveChanges خطا می‌دهد.
            _context.Entry(entity).Property(x => x.RowVersion).OriginalValue = request.RowVersion;
        }

        entity.Title = request.Title;
        entity.Symbol = request.Symbol;
        entity.Precision = request.Precision;
        entity.IsActive = request.IsActive;
        entity.BaseUnitId = request.BaseUnitId;
        // اصلاح منطق ضریب تبدیل:
        // ۱. اگر واحد پایه دارد (زیرمجموعه است) -> از ضریب ارسالی استفاده کن (اگر نال بود ۱ بذار)
        // ۲. اگر واحد پایه ندارد (واحد اصلی است) -> ضریب باید همیشه ۱ باشد
        if (request.BaseUnitId.HasValue)
        {
            entity.ConversionFactor = request.ConversionFactor ?? 1;
        }
        else
        {
            entity.ConversionFactor = 1;
        }
        
        // نکته: LastModifiedAt توسط Interceptor پر می‌شود، نیازی به ست کردن دستی نیست.

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // اینجا می‌توانید ارور خاص بدهید تا فرانت به کاربر بگوید:
            // "داده‌ها توسط کاربر دیگری تغییر کرده است. لطفاً صفحه را رفرش کنید."
            throw new Exception("داده‌ها توسط کاربر دیگری تغییر کرده است. لطفاً صفحه را رفرش کنید.");
        }

        return true;
    }
}