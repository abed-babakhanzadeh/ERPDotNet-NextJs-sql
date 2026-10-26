using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.BaseInfo.Contracts;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Production.Services;

// مرکز کاری به مرکز هزینه ارجاع می‌دهد؛ حذف مرکز هزینه در حال استفاده ممنوع است
public class ProductionBaseInfoUsageChecker : IBaseInfoUsageChecker
{
    private readonly IApplicationDbContext _context;

    public ProductionBaseInfoUsageChecker(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<string?> FindUsageAsync(BaseInfoReference kind, int id, CancellationToken cancellationToken) =>
        kind == BaseInfoReference.CostCenter && await _context.WorkCenters.AnyAsync(w => w.CostCenterId == id, cancellationToken)
            ? "این مرکز هزینه به مرکز کاری تولید نسبت داده شده و قابل حذف نیست."
            : null;
}
