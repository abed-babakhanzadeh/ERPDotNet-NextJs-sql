using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Queries.StockCounts;

public record StockCountLineDto(
    long Id,
    int ProductId,
    string ProductCode,
    string ProductName,
    string UnitTitle,
    int? LocationId,
    string? LocationCode,
    int? BatchId,
    string? BatchNumber,
    decimal SystemQuantity,
    decimal? CountedQuantity,
    // اختلاف با موجودی زمان شروع؛ همین مقدار سند اصلاحی می‌شود
    decimal? Difference
);

public record StockCountDto(
    int Id,
    DateTime CountDate,
    int WarehouseId,
    string WarehouseTitle,
    int StatusId,
    string StatusTitle,
    string? Description,
    long? SurplusDocId,
    long? SurplusDocNumber,
    long? ShortageDocId,
    long? ShortageDocNumber,
    List<StockCountLineDto> Lines
);

public record GetStockCountByIdQuery(int Id) : IRequest<StockCountDto?>;

public class GetStockCountByIdHandler : IRequestHandler<GetStockCountByIdQuery, StockCountDto?>
{
    private readonly IApplicationDbContext _context;

    public GetStockCountByIdHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<StockCountDto?> Handle(GetStockCountByIdQuery request, CancellationToken cancellationToken)
    {
        var count = await _context.StockCounts.AsNoTracking()
            .Include(x => x.Warehouse)
            .Include(x => x.Lines).ThenInclude(l => l.Product).ThenInclude(p => p!.Unit)
            .Include(x => x.Lines).ThenInclude(l => l.Location)
            .Include(x => x.Lines).ThenInclude(l => l.Batch)
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);
        if (count == null) return null;

        var docIds = new[] { count.SurplusDocId, count.ShortageDocId }.Where(d => d.HasValue).Select(d => d!.Value).ToList();
        var docNumbers = await _context.InventoryDocHeaders.AsNoTracking()
            .Where(d => docIds.Contains(d.Id))
            .ToDictionaryAsync(d => d.Id, d => d.DocNumber, cancellationToken);
        long? NumberOf(long? id) => id.HasValue && docNumbers.TryGetValue(id.Value, out var n) ? n : null;

        var lines = count.Lines
            .OrderBy(l => l.Product?.Code).ThenBy(l => l.Location?.Code).ThenBy(l => l.Batch?.BatchNumber)
            .Select(l => new StockCountLineDto(
                l.Id, l.ProductId, l.Product?.Code ?? "", l.Product?.Name ?? "", l.Product?.Unit?.Title ?? "",
                l.LocationId, l.Location?.Code, l.BatchId, l.Batch?.BatchNumber,
                l.SystemQuantity, l.CountedQuantity, l.CountedQuantity - l.SystemQuantity))
            .ToList();

        return new StockCountDto(
            count.Id, count.CountDate, count.WarehouseId, count.Warehouse?.Title ?? "",
            (int)count.Status, count.Status.ToDisplay(), count.Description,
            count.SurplusDocId, NumberOf(count.SurplusDocId), count.ShortageDocId, NumberOf(count.ShortageDocId),
            lines);
    }
}
