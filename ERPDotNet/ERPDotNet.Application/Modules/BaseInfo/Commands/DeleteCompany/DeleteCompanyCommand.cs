using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.BaseInfo.Contracts;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.DeleteCompany;

public record DeleteCompanyCommand(int Id) : IRequest<bool>;

public class DeleteCompanyHandler : IRequestHandler<DeleteCompanyCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IEnumerable<IBaseInfoUsageChecker> _usageCheckers;

    public DeleteCompanyHandler(IApplicationDbContext context, IEnumerable<IBaseInfoUsageChecker> usageCheckers)
    {
        _context = context;
        _usageCheckers = usageCheckers;
    }

    public async Task<bool> Handle(DeleteCompanyCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Companies.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("شرکت یافت نشد.");

        if (await _context.FiscalYears.AnyAsync(x => x.CompanyId == request.Id, cancellationToken))
            throw new BusinessRuleException("برای این شرکت سال مالی تعریف شده و قابل حذف نیست.");

        await BaseInfoUsage.EnsureUnusedAsync(_usageCheckers, BaseInfoReference.Company, request.Id, cancellationToken);

        entity.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
