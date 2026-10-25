using ERPDotNet.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Services;

// درخواست‌های انبار با این قراردادها پیش از اجرای هندلر از نظر دسترسی سطح داده بررسی می‌شوند
// (پیاده‌سازی صریح interface تا این شناسه‌ها در بدنه API و قرارداد OpenAPI ظاهر نشوند)

/// <summary>درخواستی که روی انبار(های) مشخص کار می‌کند</summary>
public interface IWarehouseScopedRequest
{
    IEnumerable<int> ScopedWarehouseIds { get; }
}

/// <summary>درخواستی که روی یک سند انبار موجود کار می‌کند؛ انبار مبدأ سند باید مجاز باشد</summary>
public interface IInventoryDocScopedRequest
{
    long ScopedDocId { get; }

    /// <summary>فقط مشاهده: انبار مقصد سند انتقالی هم کافی است</summary>
    bool ReadOnlyAccess => false;
}

/// <summary>درخواستی که روی یک انبارگردانی موجود کار می‌کند</summary>
public interface IStockCountScopedRequest
{
    int ScopedStockCountId { get; }
}

public class WarehouseAccessBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IWarehouseAccessService _access;
    private readonly IApplicationDbContext _context;

    public WarehouseAccessBehavior(IWarehouseAccessService access, IApplicationDbContext context)
    {
        _access = access;
        _context = context;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (request is IWarehouseScopedRequest scoped)
            foreach (var id in scoped.ScopedWarehouseIds.Where(id => id > 0).Distinct())
                await _access.EnsureAccessAsync(id, cancellationToken);

        if (request is IInventoryDocScopedRequest docScoped)
        {
            var doc = await _context.InventoryDocHeaders
                .AsNoTracking()
                .Where(d => d.Id == docScoped.ScopedDocId)
                .Select(d => new { d.WarehouseId, d.DestinationWarehouseId })
                .FirstOrDefaultAsync(cancellationToken);
            // سند ناموجود را خود هندلر با پیام مناسب رد می‌کند
            if (doc != null)
            {
                var allowed = await _access.GetAllowedWarehouseIdsAsync(cancellationToken);
                if (allowed != null && !allowed.Contains(doc.WarehouseId) &&
                    !(docScoped.ReadOnlyAccess && doc.DestinationWarehouseId is int dest && allowed.Contains(dest)))
                    await _access.EnsureAccessAsync(doc.WarehouseId, cancellationToken);
            }
        }

        if (request is IStockCountScopedRequest countScoped)
        {
            var warehouseId = await _context.StockCounts
                .AsNoTracking()
                .Where(c => c.Id == countScoped.ScopedStockCountId)
                .Select(c => (int?)c.WarehouseId)
                .FirstOrDefaultAsync(cancellationToken);
            if (warehouseId.HasValue)
                await _access.EnsureAccessAsync(warehouseId.Value, cancellationToken);
        }

        return await next();
    }
}
