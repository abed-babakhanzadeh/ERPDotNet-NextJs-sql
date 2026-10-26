using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.Contracts;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Services;

public class InventoryAvailabilityReader : IInventoryAvailabilityReader
{
    private readonly IApplicationDbContext _context;
    private readonly IWarehouseAccessService _access;

    public InventoryAvailabilityReader(IApplicationDbContext context, IWarehouseAccessService access)
    {
        _context = context;
        _access = access;
    }

    public async Task<AvailableStock> GetUsableAsync(
        IReadOnlyCollection<int> productIds, IReadOnlyCollection<int>? warehouseIds, CancellationToken cancellationToken)
    {
        // قاعده سخت‌گیرانه دسترسی انبار اینجا هم برقرار است
        var allowed = await _access.GetAllowedWarehouseIdsAsync(cancellationToken);
        var today = DateTime.UtcNow.Date;

        var query = _context.CurrentStocks.AsNoTracking()
            .Where(s => productIds.Contains(s.ProductId)
                && s.Warehouse!.IsActive
                // مقایسه صریح: Contains روی آرایه در C# 14 به ReadOnlySpan می‌رسد که EF ترجمه نمی‌کند
                && (s.Warehouse.Type == WarehouseType.Physical || s.Warehouse.Type == WarehouseType.ShopFloor)
                && (s.BatchId == null || (s.Batch!.QcStatus == BatchQcStatus.Released && !s.Batch.IsBlocked
                    && (s.Batch.ExpiryDate == null || s.Batch.ExpiryDate >= today))));
        if (allowed != null) query = query.Where(s => allowed.Contains(s.WarehouseId));
        if (warehouseIds is { Count: > 0 }) query = query.Where(s => warehouseIds.Contains(s.WarehouseId));

        var byProduct = await query
            .GroupBy(s => s.ProductId)
            .Select(g => new { ProductId = g.Key, Quantity = g.Sum(s => s.QuantityOnHand - s.QuantityReserved) })
            .ToDictionaryAsync(x => x.ProductId, x => Math.Max(0, x.Quantity), cancellationToken);

        return new AvailableStock(byProduct, allowed != null);
    }
}
