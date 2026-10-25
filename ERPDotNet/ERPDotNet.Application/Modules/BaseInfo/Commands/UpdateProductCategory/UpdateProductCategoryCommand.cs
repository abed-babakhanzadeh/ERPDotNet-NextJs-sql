using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.UpdateProductCategory;

public record UpdateProductCategoryCommand : IRequest<bool>
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public required string Title { get; set; }
    public int? ParentId { get; set; }
    public bool IsActive { get; set; }
    public byte[]? RowVersion { get; set; }
}

public class UpdateProductCategoryValidator : AbstractValidator<UpdateProductCategoryCommand>
{
    public UpdateProductCategoryValidator(IApplicationDbContext context)
    {
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(20)
            .MustAsync(async (cmd, code, ct) => !await context.ProductCategories.AnyAsync(c => c.Code == code && c.Id != cmd.Id, ct))
            .WithMessage("کد گروه کالا تکراری است.");
        RuleFor(x => x.Title).NotEmpty().MaximumLength(100);
    }
}

public class UpdateProductCategoryHandler : IRequestHandler<UpdateProductCategoryCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateProductCategoryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateProductCategoryCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.ProductCategories.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("گروه کالا یافت نشد.");

        if (request.ParentId.HasValue && request.ParentId != entity.ParentId)
            await EnsureNoCycleAsync(entity.Id, request.ParentId.Value, cancellationToken);

        if (request.RowVersion is { Length: > 0 })
            _context.Entry(entity).Property(x => x.RowVersion).OriginalValue = request.RowVersion;

        entity.Code = request.Code.Trim();
        entity.Title = request.Title.Trim();
        entity.ParentId = request.ParentId;
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

    // والد جدید نباید خود این گروه یا یکی از زیرمجموعه‌هایش باشد
    private async Task EnsureNoCycleAsync(int id, int parentId, CancellationToken ct)
    {
        var parents = await _context.ProductCategories.AsNoTracking()
            .ToDictionaryAsync(x => x.Id, x => x.ParentId, ct);

        int? current = parentId;
        var guard = 0;
        while (current.HasValue && guard++ < parents.Count + 1)
        {
            if (current == id)
                throw new BusinessRuleException("گروه کالا نمی‌تواند زیرمجموعه خودش یا زیرمجموعه‌هایش باشد.");
            if (!parents.TryGetValue(current.Value, out current))
                throw new BusinessRuleException("گروه کالا والد یافت نشد.");
        }
    }
}
