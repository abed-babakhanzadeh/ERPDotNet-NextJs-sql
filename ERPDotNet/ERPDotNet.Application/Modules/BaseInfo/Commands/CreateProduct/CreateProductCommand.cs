using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.CreateProduct;

[CacheInvalidation("Products")]
public record CreateProductCommand : IRequest<int>
{
    public required string Code { get; set; }
    public required string Name { get; set; }
    public string? LatinName { get; set; } 
    public string? Descriptions { get; set; }
    public required int UnitId { get; set; }
    public ProductSupplyType SupplyType { get; set; }
    public string? ImagePath { get; set; }
    public List<ProductConversionInput> Conversions { get; set; } = new();
}

public class ProductConversionInput
{
    public int AlternativeUnitId { get; set; }
    public decimal Factor { get; set; }
}

public class CreateProductValidator : AbstractValidator<CreateProductCommand>
{
    // ولیدیشن‌ها را اینجا چک می‌کنیم تا پیام فارسی برگردد
    public CreateProductValidator()
    {
        RuleFor(v => v.Code)
            .NotEmpty().WithMessage("لطفا کد کالا را وارد کنید.");

        RuleFor(v => v.Name)
            .NotEmpty().WithMessage("لطفا نام کالا را وارد کنید.");

        RuleFor(v => v.UnitId)
            .GreaterThan(0).WithMessage("لطفا واحد سنجش را انتخاب کنید.");
            
        RuleFor(v => v.SupplyType)
            .IsInEnum().WithMessage("لطفا نوع تامین معتبر انتخاب کنید.");
    }
}

public class CreateProductHandler : IRequestHandler<CreateProductCommand, int>
{
    private readonly IApplicationDbContext _context;

    public CreateProductHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CreateProductCommand request, CancellationToken cancellationToken)
    {
        // === چک کردن تکراری بودن کد (جلوگیری از خطای 500) ===
        var exists = await _context.Products
            .AnyAsync(p => p.Code == request.Code, cancellationToken);

        if (exists)
        {
            // پرتاب خطا با پیام فارسی مشخص
            throw new Exception($"کد کالای '{request.Code}' قبلا در سیستم ثبت شده است.");
        }

        var entity = new Product
        {
            Code = request.Code,
            Name = request.Name,
            LatinName = request.LatinName,
            Descriptions = request.Descriptions,
            UnitId = request.UnitId,
            SupplyType = request.SupplyType,
            ImagePath = request.ImagePath,
            IsActive = true
        };

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