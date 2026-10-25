using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.BaseInfo.Contracts;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Services;

// انبار به شرکت و سال مالی ارجاع می‌دهد؛ حذف آن‌ها تا وقتی استفاده شده‌اند ممنوع است
public class InventoryBaseInfoUsageChecker : IBaseInfoUsageChecker
{
    private readonly IApplicationDbContext _context;

    public InventoryBaseInfoUsageChecker(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<string?> FindUsageAsync(BaseInfoReference kind, int id, CancellationToken cancellationToken)
    {
        return kind switch
        {
            BaseInfoReference.Company when await _context.Warehouses.AnyAsync(x => x.CompanyId == id, cancellationToken)
                => "این شرکت به انبار نسبت داده شده و قابل حذف نیست.",
            BaseInfoReference.FiscalYear when await _context.InventoryDocHeaders.AnyAsync(x => x.FiscalYearId == id, cancellationToken)
                => "در این سال مالی سند انبار ثبت شده است.",
            _ => null
        };
    }
}
