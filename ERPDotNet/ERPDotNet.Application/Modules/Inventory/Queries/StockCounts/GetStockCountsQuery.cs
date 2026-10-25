using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ERPDotNet.Application.Modules.Inventory.Services;

namespace ERPDotNet.Application.Modules.Inventory.Queries.StockCounts;

public record StockCountListItemDto(
    int Id,
    DateTime CountDate,
    int WarehouseId,
    string WarehouseTitle,
    int StatusId,
    string StatusTitle,
    int LineCount,
    int CountedLines,
    string? Description
);

public record GetStockCountsQuery : PaginatedRequest, IRequest<PaginatedResult<StockCountListItemDto>>
{
    public int? WarehouseId { get; set; }
    public StockCountStatus? Status { get; set; }
}

public class GetStockCountsHandler : IRequestHandler<GetStockCountsQuery, PaginatedResult<StockCountListItemDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IWarehouseAccessService _warehouseAccess;

    public GetStockCountsHandler(IApplicationDbContext context, IWarehouseAccessService warehouseAccess)
    {
        _context = context;
        _warehouseAccess = warehouseAccess;
    }

    public async Task<PaginatedResult<StockCountListItemDto>> Handle(GetStockCountsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.StockCounts.AsNoTracking();
        var allowedWarehouses = await _warehouseAccess.GetAllowedWarehouseIdsAsync(cancellationToken);
        if (allowedWarehouses != null) query = query.Where(c => allowedWarehouses.Contains(c.WarehouseId));
        if (request.WarehouseId.HasValue) query = query.Where(x => x.WarehouseId == request.WarehouseId);
        if (request.Status.HasValue) query = query.Where(x => x.Status == request.Status);

        var page = await query
            .OrderByDescending(x => x.CountDate).ThenByDescending(x => x.Id)
            .Select(x => new
            {
                x.Id,
                x.CountDate,
                x.WarehouseId,
                WarehouseTitle = x.Warehouse != null ? x.Warehouse.Title : "",
                x.Status,
                LineCount = x.Lines.Count,
                CountedLines = x.Lines.Count(l => l.CountedQuantity != null),
                x.Description
            })
            .ToPaginatedListAsync(request.PageNumber, request.PageSize, cancellationToken);

        var items = page.Items.Select(x => new StockCountListItemDto(
            x.Id, x.CountDate, x.WarehouseId, x.WarehouseTitle, (int)x.Status, x.Status.ToDisplay(),
            x.LineCount, x.CountedLines, x.Description)).ToList();

        return new PaginatedResult<StockCountListItemDto>(items, page.TotalCount, page.PageNumber, request.PageSize);
    }
}
