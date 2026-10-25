using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.BaseInfo.Contracts;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Services;

public class FiscalYearService : IFiscalYearService
{
    private readonly IApplicationDbContext _context;

    public FiscalYearService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int?> ResolveOpenYearAsync(int? companyId, DateTime date, CancellationToken cancellationToken)
    {
        var years = _context.FiscalYears.AsNoTracking();
        if (companyId.HasValue)
            years = years.Where(x => x.CompanyId == companyId.Value);

        if (!await years.AnyAsync(cancellationToken))
            return null;

        var day = date.Date;
        var year = await years
            .Where(x => x.StartDate.Date <= day && x.EndDate.Date >= day)
            // بدون شرکت، سال‌های چند شرکت ممکن است شامل تاریخ باشند؛ سال بستهٔ شرکت دیگر نباید سند را رد کند
            .OrderBy(x => x.Status == FiscalYearStatus.Open ? 0 : 1)
            .ThenBy(x => x.StartDate)
            .Select(x => new { x.Id, x.Title, x.Status })
            .FirstOrDefaultAsync(cancellationToken);

        if (year == null)
            throw new BusinessRuleException("تاریخ سند در هیچ سال مالی تعریف‌شده‌ای قرار ندارد.");
        if (year.Status != FiscalYearStatus.Open)
            throw new BusinessRuleException($"سال مالی {year.Title} بسته شده است و سند جدید در آن ثبت نمی‌شود.");

        return year.Id;
    }

    public async Task EnsureOpenAsync(int? fiscalYearId, CancellationToken cancellationToken)
    {
        if (!fiscalYearId.HasValue) return;

        var year = await _context.FiscalYears
            .AsNoTracking()
            .Where(x => x.Id == fiscalYearId.Value)
            .Select(x => new { x.Title, x.Status })
            .FirstOrDefaultAsync(cancellationToken);

        if (year != null && year.Status != FiscalYearStatus.Open)
            throw new BusinessRuleException($"سال مالی {year.Title} بسته شده است و سندهای آن تغییر نمی‌کنند.");
    }
}
