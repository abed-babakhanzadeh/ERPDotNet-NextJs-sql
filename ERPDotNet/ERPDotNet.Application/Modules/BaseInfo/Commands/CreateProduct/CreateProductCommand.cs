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

        RuleFor(v => v.Code).NotEmpty().MaximumLength(50)
            .MustAsync(BeUniqueCode).WithMessage("این کد کالا قبلاً ثبت شده است.");

        RuleFor(v => v.Name).NotEmpty().MaximumLength(200);
        RuleFor(v => v.UnitId).GreaterThan(0);
        
        // اعتبارسنجی تبدیل‌ها
        RuleForEach(v => v.Conversions).ChildRules(c => {
            c.RuleFor(x => x.AlternativeUnitId).GreaterThan(0);
            c.RuleFor(x => x.Factor).GreaterThan(0);
        });
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