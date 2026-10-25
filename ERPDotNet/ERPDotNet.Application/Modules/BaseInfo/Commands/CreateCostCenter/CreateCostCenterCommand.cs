using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.CreateCostCenter;

public record CreateCostCenterCommand : IRequest<int>
{
    public required string Code { get; set; }
    public required string Title { get; set; }
    public CostCenterType Type { get; set; } = CostCenterType.Production;
    public int? ParentId { get; set; }
}

public class CreateCostCenterValidator : AbstractValidator<CreateCostCenterCommand>
{
    public CreateCostCenterValidator(IApplicationDbContext context)
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(20)
            .MustAsync(async (code, ct) => !await context.CostCenters.AnyAsync(c => c.Code == code, ct))
            .WithMessage("کد مرکز هزینه تکراری است.");
        RuleFor(x => x.Title).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.ParentId)
            .MustAsync(async (id, ct) => await context.CostCenters.AnyAsync(c => c.Id == id, ct))
            .When(x => x.ParentId.HasValue)
            .WithMessage("مرکز هزینه والد یافت نشد.");
    }
}

public class CreateCostCenterHandler : IRequestHandler<CreateCostCenterCommand, int>
{
    private readonly IApplicationDbContext _context;

    public CreateCostCenterHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CreateCostCenterCommand request, CancellationToken cancellationToken)
    {
        var entity = new CostCenter
        {
            Code = request.Code.Trim(),
            Title = request.Title.Trim(),
            Type = request.Type,
            ParentId = request.ParentId,
            IsActive = true
        };

        _context.CostCenters.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }
}
