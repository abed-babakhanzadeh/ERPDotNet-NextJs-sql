using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.UpdateCostCenter;

public record UpdateCostCenterCommand : IRequest<bool>
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public required string Title { get; set; }
    public CostCenterType Type { get; set; }
    public int? ParentId { get; set; }
    public bool IsActive { get; set; }
    public byte[]? RowVersion { get; set; }
}

public class UpdateCostCenterValidator : AbstractValidator<UpdateCostCenterCommand>
{
    public UpdateCostCenterValidator(IApplicationDbContext context)
    {
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(20)
            .MustAsync(async (cmd, code, ct) => !await context.CostCenters.AnyAsync(c => c.Code == code && c.Id != cmd.Id, ct))
            .WithMessage("کد مرکز هزینه تکراری است.");
        RuleFor(x => x.Title).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Type).IsInEnum();
    }
}

public class UpdateCostCenterHandler : IRequestHandler<UpdateCostCenterCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateCostCenterHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateCostCenterCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.CostCenters.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("مرکز هزینه یافت نشد.");

        if (request.ParentId.HasValue && request.ParentId != entity.ParentId)
            await EnsureNoCycleAsync(entity.Id, request.ParentId.Value, cancellationToken);

        if (request.RowVersion is { Length: > 0 })
            _context.Entry(entity).Property(x => x.RowVersion).OriginalValue = request.RowVersion;

        entity.Code = request.Code.Trim();
        entity.Title = request.Title.Trim();
        entity.Type = request.Type;
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

    // والد جدید نباید خود این مرکز یا یکی از زیرمجموعه‌هایش باشد
    private async Task EnsureNoCycleAsync(int id, int parentId, CancellationToken ct)
    {
        var parents = await _context.CostCenters.AsNoTracking()
            .ToDictionaryAsync(x => x.Id, x => x.ParentId, ct);

        int? current = parentId;
        var guard = 0;
        while (current.HasValue && guard++ < parents.Count + 1)
        {
            if (current == id)
                throw new BusinessRuleException("مرکز هزینه نمی‌تواند زیرمجموعه خودش یا زیرمجموعه‌هایش باشد.");
            if (!parents.TryGetValue(current.Value, out current))
                throw new BusinessRuleException("مرکز هزینه والد یافت نشد.");
        }
    }
}
