using ERPDotNet.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.CreateFiscalYear;

public static class FiscalYearRules
{
    /// <summary>سال‌های مالی یک شرکت نباید بازه مشترک داشته باشند</summary>
    public static async Task<string?> FindOverlapAsync(
        IApplicationDbContext context, int companyId, DateTime start, DateTime end, int? excludeId, CancellationToken ct)
    {
        return await context.FiscalYears
            .AsNoTracking()
            .Where(x => x.CompanyId == companyId && x.Id != excludeId
                        && x.StartDate.Date <= end.Date && x.EndDate.Date >= start.Date)
            .Select(x => x.Title)
            .FirstOrDefaultAsync(ct);
    }
}
