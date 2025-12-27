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

        RuleFor(v => v.Code).NotEmpty().MaximumLength(50)
            .MustAsync(BeUniqueCode).WithMessage("این کد کالا قبلاً برای محصول دیگری ثبت شده است.");

        RuleFor(v => v.Name).NotEmpty().MaximumLength(200);
        RuleFor(v => v.UnitId).GreaterThan(0);

        // ولیدیشن برای لیست فرزندان
        RuleForEach(v => v.Conversions).ChildRules(c => {
            c.RuleFor(x => x.AlternativeUnitId).GreaterThan(0);
            c.RuleFor(x => x.Factor).GreaterThan(0);
        });
    }

    // چک کردن یکتایی کد (باید رکوردهای دیگر را چک کند، نه خودش را)
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

        if (entity == null) return false; // یا پرتاب NotFoundException

        // === 2. کنترل همروندی (Optimistic Concurrency) ===
        if (request.RowVersion != null && request.RowVersion.Length > 0)
        {
            // به EF می‌گوییم مقدار اورجینال دیتابیس باید این باشد
            // اگر کسی در این فاصله دیتابیس را تغییر داده باشد، موقع Save خطا می‌خوریم
            _context.Entry(entity).Property(p => p.RowVersion).OriginalValue = request.RowVersion;
        }

        // === 3. مدیریت امن فایل (Safe File Handling) ===
        string? oldImagePath = null;
        // اگر عکس تغییر کرده (چه جدید آمده، چه نال شده)
        if (request.ImagePath != entity.ImagePath)
        {
            oldImagePath = entity.ImagePath; // مسیر قدیمی را نگه دار
            entity.ImagePath = request.ImagePath; // مسیر جدید را ست کن
        }

        // === 4. آپدیت فیلدهای ساده ===
        entity.Code = request.Code;
        entity.Name = request.Name;
        entity.LatinName = request.LatinName;
        entity.Descriptions = request.Descriptions; // <--- فیلد تغییر نام یافته
        entity.UnitId = request.UnitId;
        entity.SupplyType = request.SupplyType;
        entity.IsActive = request.IsActive;

        // === 5. مدیریت هوشمند لیست فرزندان (Smart Sync) ===
        
        // الف) حذف موارد حذف شده:
        // تبدیل‌هایی که در دیتابیس هستند اما در لیست ورودی نیستند
        var requestConversionIds = request.Conversions
            .Where(c => c.Id.HasValue && c.Id.Value > 0)
            .Select(c => c.Id!.Value)
            .ToList();

        var toDelete = entity.UnitConversions
            .Where(c => !requestConversionIds.Contains(c.Id))
            .ToList();

        foreach (var item in toDelete)
        {
            // حذف از لیست (EF Core خودش Delete را صادر می‌کند)
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

            // 7. حالا که ذخیره با موفقیت انجام شد، فایل قدیمی را پاک کن
            if (!string.IsNullOrEmpty(oldImagePath))
            {
                try 
                { 
                    _fileService.DeleteFile(oldImagePath); 
                } 
                catch 
                { 
                    // لاگ کردن خطا (چون نباید باعث شکست عملیات اصلی شود)
                    // _logger.LogWarning("Failed to delete old image...");
                }
            }
        }
        catch (DbUpdateConcurrencyException)
        {
            // پرتاب خطا به سمت فرانت برای نمایش پیام مناسب
            throw new Exception("این رکورد توسط کاربر دیگری تغییر یافته است. لطفاً صفحه را رفرش کنید.");
        }

        return true;
    }
}