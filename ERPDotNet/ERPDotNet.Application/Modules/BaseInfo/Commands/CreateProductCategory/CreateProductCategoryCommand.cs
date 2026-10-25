using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.CreateProductCategory;

public record CreateProductCategoryCommand : IRequest<int>
{
    public required string Code { get; set; }
    public required string Title { get; set; }
    public int? ParentId { get; set; }
}

public class CreateProductCategoryValidator : AbstractValidator<CreateProductCategoryCommand>
{
    public CreateProductCategoryValidator(IApplicationDbContext context)
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(20)
            .MustAsync(async (code, ct) => !await context.ProductCategories.AnyAsync(c => c.Code == code, ct))
            .WithMessage("کد گروه کالا تکراری است.");
        RuleFor(x => x.Title).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ParentId)
            .MustAsync(async (id, ct) => await context.ProductCategories.AnyAsync(c => c.Id == id, ct))
            .When(x => x.ParentId.HasValue)
            .WithMessage("گروه کالا والد یافت نشد.");
    }
}

public class CreateProductCategoryHandler : IRequestHandler<CreateProductCategoryCommand, int>
{
    private readonly IApplicationDbContext _context;

    public CreateProductCategoryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CreateProductCategoryCommand request, CancellationToken cancellationToken)
    {
        var entity = new ProductCategory
        {
            Code = request.Code.Trim(),
            Title = request.Title.Trim(),
            ParentId = request.ParentId,
            IsActive = true
        };

        _context.ProductCategories.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }
}
