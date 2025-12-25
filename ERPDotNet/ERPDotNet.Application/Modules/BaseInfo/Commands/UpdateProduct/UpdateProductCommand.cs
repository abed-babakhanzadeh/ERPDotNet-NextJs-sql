using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.UpdateProduct;

[CacheInvalidation("Products")] // باطل کردن کش لیست کالاها
public record UpdateProductCommand : IRequest<bool>
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public required string Name { get; set; }
    public string? LatinName { get; set; } 
    
    // تغییر نام فیلد طبق خواسته شما
    public string? Descriptions { get; set; } 
    
    public required int UnitId { get; set; }
    public ProductSupplyType SupplyType { get; set; }
    public string? ImagePath { get; set; }
    public bool IsActive { get; set; }

    // فیلد ضروری برای کنترل همروندی (از فرانت ارسال می‌شود)
    public byte[]? RowVersion { get; set; }

    // لیست تبدیل‌ها برای ویرایش
    public List<ProductConversionUpdateDto> Conversions { get; set; } = new();
}

public class ProductConversionUpdateDto
{
    // اگر ID بفرستد یعنی می‌خواهد این سطر را آپدیت کند
    // اگر 0 یا null بفرستد یعنی جدید است
    public int? Id { get; set; } 
    public int AlternativeUnitId { get; set; }
    public decimal Factor { get; set; }
}

public class UpdateProductValidator : AbstractValidator<UpdateProductCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateProductValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(v => v.Id).GreaterThan(0);

        // 1. چک کردن کد تکراری (برای رکوردهای دیگر)
        RuleFor(v => v.Code)
            .NotEmpty().WithMessage("کد کالا الزامی است.")
            .MaximumLength(50)
            // *** تغییر مهم: استفاده از Lambda برای پاس دادن مدل ***
            .MustAsync((model, code, token) => BeUniqueCode(model, code, token))
            .WithMessage("این کد کالا قبلاً برای محصول دیگری ثبت شده است.");

        RuleFor(v => v.Name).NotEmpty().WithMessage("نام کالا الزامی است.").MaximumLength(200);
        
        // 2. چک کردن وجود واحد سنجش در دیتابیس
        RuleFor(v => v.UnitId)
            .GreaterThan(0).WithMessage("واحد سنجش را انتخاب کنید.")
            .MustAsync(async (id, token) => await _context.Units.AnyAsync(u => u.Id == id, token))
            .WithMessage("واحد سنجش انتخاب شده نامعتبر است.");

        // 3. اعتبارسنجی لیست تبدیل‌ها (مشابه Create)
        RuleForEach(v => v.Conversions).ChildRules(c => {
            c.RuleFor(x => x.AlternativeUnitId).GreaterThan(0).WithMessage("واحد فرعی نامعتبر است.");
            c.RuleFor(x => x.Factor).GreaterThan(0).WithMessage("ضریب تبدیل باید بزرگتر از صفر باشد.");
        });

        // جلوگیری از واحدهای تکراری در لیست تبدیل
        RuleFor(x => x.Conversions)
            .Must(conversions =>
            {
                if (conversions == null || !conversions.Any()) return true;
                var distinctCount = conversions.Select(c => c.AlternativeUnitId).Distinct().Count();
                return distinctCount == conversions.Count;
            })
            .WithMessage("در لیست تبدیل واحدها، نمی‌توانید یک واحد را چند بار تکرار کنید.");

        // جلوگیری از تبدیل واحد به خودش (UnitId نباید در Conversions باشد)
        RuleFor(x => x)
            .Must(x =>
            {
                if (x.Conversions == null) return true;
                return !x.Conversions.Any(c => c.AlternativeUnitId == x.UnitId);
            })
            .WithMessage("واحد اصلی کالا نمی‌تواند به عنوان واحد فرعی تعریف شود.");
    }

    // متد چک کردن یکتایی با ۳ پارامتر
    private async Task<bool> BeUniqueCode(UpdateProductCommand model, string code, CancellationToken cancellationToken)
    {
        return !await _context.Products
            .AnyAsync(p => p.Code == code && p.Id != model.Id, cancellationToken);
    }
}

public class UpdateProductHandler : IRequestHandler<UpdateProductCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IFileService _fileService;

    public UpdateProductHandler(IApplicationDbContext context, IFileService fileService)
    {
        _context = context;
        _fileService = fileService;
    }

    public async Task<bool> Handle(UpdateProductCommand request, CancellationToken cancellationToken)
    {
        // 1. لود کردن کالا همراه با فرزندان (تبدیل‌ها)
        var entity = await _context.Products
            .Include(p => p.UnitConversions)
            .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken);

        if (entity == null) return false; 

        // === 2. کنترل همروندی (Optimistic Concurrency) ===
        if (request.RowVersion != null && request.RowVersion.Length > 0)
        {
            _context.Entry(entity).Property(p => p.RowVersion).OriginalValue = request.RowVersion;
        }

        // === 3. مدیریت امن فایل (Safe File Handling) ===
        string? oldImagePath = null;
        if (request.ImagePath != entity.ImagePath)
        {
            oldImagePath = entity.ImagePath; 
            entity.ImagePath = request.ImagePath; 
        }

        // === 4. آپدیت فیلدهای ساده ===
        entity.Code = request.Code;
        entity.Name = request.Name;
        entity.LatinName = request.LatinName;
        entity.Descriptions = request.Descriptions; 
        entity.UnitId = request.UnitId;
        entity.SupplyType = request.SupplyType;
        entity.IsActive = request.IsActive;

        // === 5. مدیریت هوشمند لیست فرزندان (Smart Sync) ===
        
        // الف) حذف موارد حذف شده:
        var requestConversionIds = request.Conversions
            .Where(c => c.Id.HasValue && c.Id.Value > 0)
            .Select(c => c.Id!.Value)
            .ToList();

        var toDelete = entity.UnitConversions
            .Where(c => !requestConversionIds.Contains(c.Id))
            .ToList();

        foreach (var item in toDelete)
        {
            _context.ProductUnitConversions.Remove(item);
        }

        // ب) افزودن یا ویرایش موارد
        foreach (var convDto in request.Conversions)
        {
            if (convDto.Id.HasValue && convDto.Id.Value > 0)
            {
                // --- ویرایش موجود ---
                var existingConv = entity.UnitConversions
                    .FirstOrDefault(c => c.Id == convDto.Id.Value);

                if (existingConv != null)
                {
                    existingConv.AlternativeUnitId = convDto.AlternativeUnitId;
                    existingConv.Factor = convDto.Factor;
                }
            }
            else
            {
                // --- افزودن جدید ---
                entity.UnitConversions.Add(new ProductUnitConversion
                {
                    AlternativeUnitId = convDto.AlternativeUnitId,
                    Factor = convDto.Factor
                });
            }
        }

        try
        {
            // 6. ذخیره در دیتابیس
            await _context.SaveChangesAsync(cancellationToken);

            // 7. پاک کردن تصویر قدیمی بعد از ذخیره موفق
            if (!string.IsNullOrEmpty(oldImagePath))
            {
                try { _fileService.DeleteFile(oldImagePath); } catch { }
            }
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new Exception("این رکورد توسط کاربر دیگری تغییر یافته است. لطفاً صفحه را رفرش کنید.");
        }

        return true;
    }
}