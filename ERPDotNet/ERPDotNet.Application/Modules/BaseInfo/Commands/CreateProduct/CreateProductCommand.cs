using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.CreateProduct;

// 1. تعریف ورودی (شامل لیست تبدیل‌ها)
[CacheInvalidation("Products")] // پاک کردن کش لیست کالاها بعد از ثبت
public record CreateProductCommand : IRequest<int>
{
    public required string Code { get; set; }
    public required string Name { get; set; }
    public string? LatinName { get; set; } 
    public string? Descriptions { get; set; }
    public required int UnitId { get; set; } // واحد اصلی
    public ProductSupplyType SupplyType { get; set; } // 1: خریدنی، 2: تولیدی
    public string? ImagePath { get; set; }
    
    // لیست تبدیل واحدها (اختیاری)
    public List<ProductConversionInput> Conversions { get; set; } = new();
}

public class ProductConversionInput
{
    public int AlternativeUnitId { get; set; }
    public decimal Factor { get; set; }
}

// 2. اعتبارسنجی

public class CreateProductValidator : AbstractValidator<CreateProductCommand>
{
    private readonly IApplicationDbContext _context;

    public CreateProductValidator(IApplicationDbContext context)
    {
        _context = context;

        // 1. بررسی نام کالا
        RuleFor(v => v.Name)
            .NotEmpty().WithMessage("نام کالا نمی‌تواند خالی باشد.")
            .MaximumLength(200).WithMessage("نام کالا نمی‌تواند بیشتر از 200 کاراکتر باشد.");

        // 2. بررسی یکتایی کد کالا
        RuleFor(v => v.Code)
            .NotEmpty().WithMessage("کد کالا الزامی است.")
            .MaximumLength(50).WithMessage("کد کالا طولانی است.")
            .MustAsync(BeUniqueCode).WithMessage("این کد کالا قبلاً ثبت شده است.");

        // 3. بررسی وجود واحد سنجش (جلوگیری از خطای کلید خارجی)
        RuleFor(v => v.UnitId)
            .GreaterThan(0).WithMessage("واحد سنجش را انتخاب کنید.")
            .MustAsync(async (id, token) => await _context.Units.AnyAsync(u => u.Id == id, token))
            .WithMessage("واحد سنجش انتخاب شده معتبر نیست (در سیستم یافت نشد).");

        // 4. اعتبارسنجی‌های پیشرفته برای لیست تبدیل‌ها
        RuleForEach(v => v.Conversions).ChildRules(c => {
            c.RuleFor(x => x.AlternativeUnitId).GreaterThan(0).WithMessage("واحد فرعی نامعتبر است.");
            c.RuleFor(x => x.Factor).GreaterThan(0).WithMessage("ضریب تبدیل باید بزرگتر از صفر باشد.");
        });

        // جلوگیری از تکراری بودن واحد در لیست تبدیل‌ها
        RuleFor(x => x.Conversions)
            .Must(conversions =>
            {
                if (conversions == null || !conversions.Any()) return true;
                // آیا واحد تکراری در لیست هست؟
                var distinctCount = conversions.Select(c => c.AlternativeUnitId).Distinct().Count();
                return distinctCount == conversions.Count;
            })
            .WithMessage("در لیست تبدیل واحدها، یک واحد نمی‌تواند چند بار تکرار شود.");

        // جلوگیری از تبدیل واحد به خودش
        RuleFor(x => x)
            .Must(x =>
            {
                if (x.Conversions == null) return true;
                // نباید واحد اصلی در لیست واحدهای فرعی باشد
                return !x.Conversions.Any(c => c.AlternativeUnitId == x.UnitId);
            })
            .WithMessage("نمی‌توانید واحد اصلی کالا را به عنوان واحد فرعی تعریف کنید.");
    }

    private async Task<bool> BeUniqueCode(string code, CancellationToken cancellationToken)
    {
        return !await _context.Products.AnyAsync(p => p.Code == code, cancellationToken);
    }
}

// 3. هندلر (لاجیگ ذخیره)
public class CreateProductHandler : IRequestHandler<CreateProductCommand, int>
{
    private readonly IApplicationDbContext _context;

    public CreateProductHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CreateProductCommand request, CancellationToken cancellationToken)
    {
        var entity = new Product
        {
            Code = request.Code,
            Name = request.Name,
            LatinName = request.LatinName,
            Descriptions = request.Descriptions,
            UnitId = request.UnitId, // فقط واحد اصلی را ست می‌کنیم
            SupplyType = request.SupplyType,
            ImagePath = request.ImagePath,
            IsActive = true
        };

        // افزودن تبدیل‌ها (اگر وجود دارد)
        if (request.Conversions != null && request.Conversions.Any())
        {
            foreach (var conv in request.Conversions)
            {
                entity.UnitConversions.Add(new ProductUnitConversion
                {
                    AlternativeUnitId = conv.AlternativeUnitId,
                    Factor = conv.Factor
                });
            }
        }

        _context.Products.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return entity.Id;
    }
}