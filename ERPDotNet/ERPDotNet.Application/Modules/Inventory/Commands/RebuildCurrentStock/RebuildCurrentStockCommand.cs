using ERPDotNet.Application.Common.Constants;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ERPDotNet.Application.Modules.Inventory.Commands.RebuildCurrentStock;

// پیش‌نمایش: فقط ردیف‌هایی که موجودی فعلی‌شان با جمع تراکنش‌ها نمی‌خواند (بدون تغییر داده)
public record PreviewStockRebuildQuery : IRequest<List<StockRebuildRowDto>>;

public class PreviewStockRebuildHandler : IRequestHandler<PreviewStockRebuildQuery, List<StockRebuildRowDto>>
{
    private readonly IApplicationDbContext _context;

    public PreviewStockRebuildHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public Task<List<StockRebuildRowDto>> Handle(PreviewStockRebuildQuery request, CancellationToken cancellationToken) =>
        StockRebuildCalculator.ComputeMismatchesAsync(_context, cancellationToken);
}

public class StockRebuildResultDto
{
    public int Updated { get; set; }
    public int Created { get; set; }
    public int Zeroed { get; set; }
}

// اعمال: QuantityOnHand هر ردیف را برابر جمع تراکنش‌ها می‌کند. QuantityReserved دست نمی‌خورد.
// اگر همزمان سندی ثبت شود، RowVersion رکورد موجودی تغییر می‌کند و SaveChanges خطای همروندی می‌دهد
// (بدون اعمال نیمه‌کاره)؛ کافی است دوباره اجرا شود.
public record RebuildCurrentStockCommand : IRequest<StockRebuildResultDto>;

public class RebuildCurrentStockHandler : IRequestHandler<RebuildCurrentStockCommand, StockRebuildResultDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;
    private readonly ILogger<RebuildCurrentStockHandler> _logger;

    public RebuildCurrentStockHandler(IApplicationDbContext context, ICacheService cacheService, ILogger<RebuildCurrentStockHandler> logger)
    {
        _context = context;
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task<StockRebuildResultDto> Handle(RebuildCurrentStockCommand request, CancellationToken cancellationToken)
    {
        var rows = await StockRebuildCalculator.ComputeMismatchesAsync(_context, cancellationToken);
        var result = new StockRebuildResultDto();
        if (rows.Count == 0) return result;

        var stockIds = rows.Where(r => r.StockId.HasValue).Select(r => r.StockId!.Value).ToList();
        var stocks = await _context.CurrentStocks
            .Where(s => stockIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, cancellationToken);

        foreach (var row in rows)
        {
            if (row.StockId.HasValue && stocks.TryGetValue(row.StockId.Value, out var stock))
            {
                stock.QuantityOnHand = row.ExpectedQuantity;
                if (row.ExpectedQuantity == 0) result.Zeroed++;
                else result.Updated++;
            }
            else
            {
                _context.CurrentStocks.Add(new CurrentStock
                {
                    WarehouseId = row.WarehouseId,
                    ProductId = row.ProductId,
                    LocationId = row.LocationId,
                    BatchId = row.BatchId,
                    QuantityOnHand = row.ExpectedQuantity,
                    QuantityReserved = 0
                });
                result.Created++;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogWarning(
            "CurrentStock rebuilt from transactions: {Updated} updated, {Created} created, {Zeroed} zeroed",
            result.Updated, result.Created, result.Zeroed);

        foreach (var key in rows.Select(r => (r.WarehouseId, r.ProductId)).Distinct())
        {
            await _cacheService.RemoveAsync(CacheKeys.CurrentStock(key.WarehouseId, key.ProductId), cancellationToken);
        }

        return result;
    }
}
