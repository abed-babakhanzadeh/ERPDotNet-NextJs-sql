using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.BaseInfo.Contracts;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.DeleteFiscalYear;

public record DeleteFiscalYearCommand(int Id) : IRequest<bool>;

public class DeleteFiscalYearHandler : IRequestHandler<DeleteFiscalYearCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IEnumerable<IBaseInfoUsageChecker> _usageCheckers;

    public DeleteFiscalYearHandler(IApplicationDbContext context, IEnumerable<IBaseInfoUsageChecker> usageCheckers)
    {
        _context = context;
        _usageCheckers = usageCheckers;
    }

    public async Task<bool> Handle(DeleteFiscalYearCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.FiscalYears.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("سال مالی یافت نشد.");

        await BaseInfoUsage.EnsureUnusedAsync(_usageCheckers, BaseInfoReference.FiscalYear, request.Id, cancellationToken);

        entity.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
