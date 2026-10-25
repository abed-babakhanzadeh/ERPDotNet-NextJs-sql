using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.RebuildCurrentStock;

public class StockRebuildRowDto
{
    public long? StockId { get; set; }
    public int WarehouseId { get; set; }
    public string WarehouseTitle { get; set; } = string.Empty;
    public int ProductId { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int? LocationId { get; set; }
    public int? BatchId { get; set; }

    // موجودی فعلی جدول CurrentStocks و موجودی صحیح بر اساس جمع تراکنش‌ها
    public decimal CurrentQuantity { get; set; }
    public decimal ExpectedQuantity { get; set; }
    public decimal Difference => ExpectedQuantity - CurrentQuantity;
}

// منبع حقیقت موجودی، دفتر تراکنش‌هاست (InventoryTransactions)؛ CurrentStocks فقط یک Snapshot است.
// این کلاس اختلاف Snapshot با دفتر را برای هر ترکیب انبار/کالا/لوکیشن/بچ محاسبه می‌کند.
internal static class StockRebuildCalculator
{
    public static async Task<List<StockRebuildRowDto>> ComputeMismatchesAsync(IApplicationDbContext context, CancellationToken cancellationToken)
    {
        var expected = await context.InventoryTransactions
            .AsNoTracking()
            .GroupBy(t => new { t.WarehouseId, t.ProductId, t.LocationId, t.BatchId })
            .Select(g => new
            {
                g.Key.WarehouseId,
                g.Key.ProductId,
                g.Key.LocationId,
                g.Key.BatchId,
                Quantity = g.Sum(t => t.Sign == InventoryTransactionSign.Increase ? t.Quantity : -t.Quantity)
            })
            .ToListAsync(cancellationToken);

        var current = await context.CurrentStocks
            .AsNoTracking()
            .Select(s => new { s.Id, s.WarehouseId, s.ProductId, s.LocationId, s.BatchId, s.QuantityOnHand })
            .ToListAsync(cancellationToken);

        var expectedByKey = expected.ToDictionary(e => (e.WarehouseId, e.ProductId, e.LocationId, e.BatchId), e => e.Quantity);
        var currentByKey = current.ToDictionary(c => (c.WarehouseId, c.ProductId, c.LocationId, c.BatchId));

        var rows = new List<StockRebuildRowDto>();
        foreach (var key in expectedByKey.Keys.Union(currentByKey.Keys))
        {
            var expectedQty = expectedByKey.GetValueOrDefault(key);
            currentByKey.TryGetValue(key, out var stock);
            var currentQty = stock?.QuantityOnHand ?? 0;

            if (expectedQty == currentQty) continue;

            rows.Add(new StockRebuildRowDto
            {
                StockId = stock?.Id,
                WarehouseId = key.WarehouseId,
                ProductId = key.ProductId,
                LocationId = key.LocationId,
                BatchId = key.BatchId,
                CurrentQuantity = currentQty,
                ExpectedQuantity = expectedQty
            });
        }

        await FillTitlesAsync(context, rows, cancellationToken);

        return rows
            .OrderBy(r => r.WarehouseTitle)
            .ThenBy(r => r.ProductCode)
            .ToList();
    }

    private static async Task FillTitlesAsync(IApplicationDbContext context, List<StockRebuildRowDto> rows, CancellationToken cancellationToken)
    {
        var productIds = rows.Select(r => r.ProductId).Distinct().ToList();
        var warehouseIds = rows.Select(r => r.WarehouseId).Distinct().ToList();

        var products = await context.Products.AsNoTracking()
            .Where(p => productIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Code, p.Name })
            .ToDictionaryAsync(p => p.Id, cancellationToken);
        var warehouses = await context.Warehouses.AsNoTracking()
            .Where(w => warehouseIds.Contains(w.Id))
            .Select(w => new { w.Id, w.Title })
            .ToDictionaryAsync(w => w.Id, w => w.Title, cancellationToken);

        foreach (var row in rows)
        {
            if (products.TryGetValue(row.ProductId, out var product))
            {
                row.ProductCode = product.Code;
                row.ProductName = product.Name;
            }
            row.WarehouseTitle = warehouses.GetValueOrDefault(row.WarehouseId, string.Empty);
        }
    }
}
