using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.CreateProductAttribute;

public record ProductAttributeValueInput
{
    // خالی برای مقدار جدید
    public int? Id { get; set; }
    public required string Code { get; set; }
    public required string Title { get; set; }
}

public record CreateProductAttributeCommand : IRequest<int>
{
    public required string Code { get; set; }
    public required string Title { get; set; }
    public List<ProductAttributeValueInput> Values { get; set; } = new();
}

/// <summary>قواعد مشترک مقادیر ویژگی در ثبت و ویرایش</summary>
public static class ProductAttributeValueRules
{
    public static void Apply<T>(IRuleBuilderInitial<T, List<ProductAttributeValueInput>> rule)
    {
        rule.NotEmpty().WithMessage("ویژگی باید دست‌کم یک مقدار داشته باشد.")
            .Must(v => v.Select(x => x.Code.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).Count() == v.Count)
            .WithMessage("کد مقادیر ویژگی نباید تکراری باشد.");
    }

    public static void ApplyEach<T>(AbstractValidator<T> validator, System.Linq.Expressions.Expression<Func<T, IEnumerable<ProductAttributeValueInput>>> values)
    {
        validator.RuleForEach(values).ChildRules(v =>
        {
            v.RuleFor(x => x.Code).NotEmpty().MaximumLength(20);
            v.RuleFor(x => x.Title).NotEmpty().MaximumLength(100);
        });
    }
}

public class CreateProductAttributeValidator : AbstractValidator<CreateProductAttributeCommand>
{
    public CreateProductAttributeValidator(IApplicationDbContext context)
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(20)
            .MustAsync(async (code, ct) => !await context.ProductAttributes.AnyAsync(a => a.Code == code, ct))
            .WithMessage("کد ویژگی تکراری است.");
        RuleFor(x => x.Title).NotEmpty().MaximumLength(100);
        ProductAttributeValueRules.Apply(RuleFor(x => x.Values));
        ProductAttributeValueRules.ApplyEach(this, x => x.Values);
    }
}

public class CreateProductAttributeHandler : IRequestHandler<CreateProductAttributeCommand, int>
{
    private readonly IApplicationDbContext _context;

    public CreateProductAttributeHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CreateProductAttributeCommand request, CancellationToken cancellationToken)
    {
        var entity = new ProductAttribute
        {
            Code = request.Code.Trim(),
            Title = request.Title.Trim(),
            IsActive = true,
            Values = request.Values.Select((v, i) => new ProductAttributeValue
            {
                Code = v.Code.Trim(),
                Title = v.Title.Trim(),
                SortOrder = i
            }).ToList()
        };

        _context.ProductAttributes.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }
}
