using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.BaseInfo.Commands.CreateProductAttribute;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.UpdateProductAttribute;

public record UpdateProductAttributeCommand : IRequest<bool>
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public required string Title { get; set; }
    public bool IsActive { get; set; }
    public List<ProductAttributeValueInput> Values { get; set; } = new();
    public byte[]? RowVersion { get; set; }
}

public class UpdateProductAttributeValidator : AbstractValidator<UpdateProductAttributeCommand>
{
    public UpdateProductAttributeValidator(IApplicationDbContext context)
    {
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(20)
            .MustAsync(async (cmd, code, ct) => !await context.ProductAttributes.AnyAsync(a => a.Code == code && a.Id != cmd.Id, ct))
            .WithMessage("کد ویژگی تکراری است.");
        RuleFor(x => x.Title).NotEmpty().MaximumLength(100);
        ProductAttributeValueRules.Apply(RuleFor(x => x.Values));
        ProductAttributeValueRules.ApplyEach(this, x => x.Values);
    }
}

public class UpdateProductAttributeHandler : IRequestHandler<UpdateProductAttributeCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateProductAttributeHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateProductAttributeCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.ProductAttributes
            .Include(a => a.Values)
            .FirstOrDefaultAsync(a => a.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("ویژگی کالا یافت نشد.");

        // مقدار حذف‌شده نباید در تنوع کالایی استفاده شده باشد
        var keptIds = request.Values.Where(v => v.Id.HasValue).Select(v => v.Id!.Value).ToHashSet();
        var removed = entity.Values.Where(v => !keptIds.Contains(v.Id)).ToList();
        if (removed.Count > 0)
        {
            var removedIds = removed.Select(v => v.Id).ToList();
            var used = await _context.ProductVariantValues
                .Where(x => removedIds.Contains(x.AttributeValueId))
                .Select(x => x.AttributeValue!.Title)
                .FirstOrDefaultAsync(cancellationToken);
            if (used != null)
                throw new BusinessRuleException($"مقدار «{used}» در تنوع کالا استفاده شده و قابل حذف نیست.");
            foreach (var value in removed) entity.Values.Remove(value);
        }

        for (var i = 0; i < request.Values.Count; i++)
        {
            var input = request.Values[i];
            var value = input.Id.HasValue ? entity.Values.FirstOrDefault(v => v.Id == input.Id) : null;
            if (value == null)
            {
                if (input.Id.HasValue) throw new BusinessRuleException("مقدار ویژگی یافت نشد.");
                value = new ProductAttributeValue { Code = input.Code.Trim(), Title = input.Title.Trim() };
                entity.Values.Add(value);
            }
            value.Code = input.Code.Trim();
            value.Title = input.Title.Trim();
            value.SortOrder = i;
        }

        if (request.RowVersion is { Length: > 0 })
            _context.Entry(entity).Property(x => x.RowVersion).OriginalValue = request.RowVersion;

        entity.Code = request.Code.Trim();
        entity.Title = request.Title.Trim();
        entity.IsActive = request.IsActive;

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw ConflictException.Concurrency();
        }
        return true;
    }
}
