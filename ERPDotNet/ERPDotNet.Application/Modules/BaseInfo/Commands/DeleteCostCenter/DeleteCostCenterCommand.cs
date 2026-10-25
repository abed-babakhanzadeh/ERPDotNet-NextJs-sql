using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.BaseInfo.Contracts;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.DeleteCostCenter;

public record DeleteCostCenterCommand(int Id) : IRequest<bool>;

public class DeleteCostCenterHandler : IRequestHandler<DeleteCostCenterCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IEnumerable<IBaseInfoUsageChecker> _usageCheckers;

    public DeleteCostCenterHandler(IApplicationDbContext context, IEnumerable<IBaseInfoUsageChecker> usageCheckers)
    {
        _context = context;
        _usageCheckers = usageCheckers;
    }

    public async Task<bool> Handle(DeleteCostCenterCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.CostCenters.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("مرکز هزینه یافت نشد.");

        if (await _context.CostCenters.AnyAsync(x => x.ParentId == request.Id, cancellationToken))
            throw new BusinessRuleException("این مرکز هزینه زیرمجموعه دارد و قابل حذف نیست.");

        await BaseInfoUsage.EnsureUnusedAsync(_usageCheckers, BaseInfoReference.CostCenter, request.Id, cancellationToken);

        entity.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
