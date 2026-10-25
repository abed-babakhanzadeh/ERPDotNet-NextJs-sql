using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ERPDotNet.Application.Modules.Inventory.Services;

namespace ERPDotNet.Application.Modules.Inventory.Queries.GetInventorySerials;

public record InventorySerialDto(
    long Id,
    int ProductId,
    string ProductCode,
    string ProductName,
    string SerialNumber,
    int StatusId,
    string StatusTitle,
    int? WarehouseId,
    string? WarehouseTitle,
    string? LocationTitle,
    long? LastDocHeaderId,
    long? LastDocNumber
);

/// <summary>گزارش شماره سریال‌ها؛ با کالا، انبار و وضعیت قابل فیلتر است</summary>
public record GetInventorySerialsQuery : PaginatedRequest, IRequest<PaginatedResult<InventorySerialDto>>
{
    public int? ProductId { get; set; }
    public int? WarehouseId { get; set; }
    public InventorySerialStatus? Status { get; set; }
}

public class GetInventorySerialsHandler : IRequestHandler<GetInventorySerialsQuery, PaginatedResult<InventorySerialDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IWarehouseAccessService _warehouseAccess;

    public GetInventorySerialsHandler(IApplicationDbContext context, IWarehouseAccessService warehouseAccess)
    {
        _context = context;
        _warehouseAccess = warehouseAccess;
    }

    public async Task<PaginatedResult<InventorySerialDto>> Handle(GetInventorySerialsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.InventorySerials.AsNoTracking();
        var allowedWarehouses = await _warehouseAccess.GetAllowedWarehouseIdsAsync(cancellationToken);
        // سریال خارج‌شده (بدون انبار) فقط برای کاربر بدون محدودیت دیده می‌شود
        if (allowedWarehouses != null) query = query.Where(s => s.WarehouseId != null && allowedWarehouses.Contains(s.WarehouseId.Value));

        if (request.ProductId.HasValue) query = query.Where(s => s.ProductId == request.ProductId);
        if (request.WarehouseId.HasValue) query = query.Where(s => s.WarehouseId == request.WarehouseId);
        if (request.Status.HasValue) query = query.Where(s => s.Status == request.Status);

        var rows =
            from s in query
            join p in _context.Products on s.ProductId equals p.Id
            join d in _context.InventoryDocHeaders on s.LastDocHeaderId equals d.Id into docs
            from d in docs.DefaultIfEmpty()
            select new { Serial = s, p.Code, p.Name, DocNumber = (long?)d.DocNumber };

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim();
            rows = rows.Where(r => r.Serial.SerialNumber.Contains(term) || r.Code.Contains(term) || r.Name.Contains(term));
        }

        var page = await rows
            .OrderBy(r => r.Code).ThenBy(r => r.Serial.SerialNumber)
            .Select(r => new
            {
                r.Serial.Id,
                r.Serial.ProductId,
                r.Code,
                r.Name,
                r.Serial.SerialNumber,
                r.Serial.Status,
                r.Serial.WarehouseId,
                WarehouseTitle = r.Serial.Warehouse != null ? r.Serial.Warehouse.Title : null,
                LocationTitle = r.Serial.Location != null ? r.Serial.Location.Code : null,
                r.Serial.LastDocHeaderId,
                r.DocNumber
            })
            .ToPaginatedListAsync(request.PageNumber, request.PageSize, cancellationToken);

        var items = page.Items.Select(r => new InventorySerialDto(
            r.Id, r.ProductId, r.Code, r.Name, r.SerialNumber, (int)r.Status, r.Status.ToDisplay(),
            r.WarehouseId, r.WarehouseTitle, r.LocationTitle, r.LastDocHeaderId, r.DocNumber)).ToList();

        return new PaginatedResult<InventorySerialDto>(items, page.TotalCount, page.PageNumber, request.PageSize);
    }
}
