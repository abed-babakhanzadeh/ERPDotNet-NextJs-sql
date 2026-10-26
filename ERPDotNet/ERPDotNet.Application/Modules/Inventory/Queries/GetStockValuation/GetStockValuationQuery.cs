using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.Inventory.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Queries.GetStockValuation;

/// <param name="WarehouseTitle">فقط در سطح «انبار»؛ در سطح «شرکت» خالی است</param>
public record StockValuationDto(
    long Id,
    int ProductId,
    string ProductCode,
    string ProductName,
    string UnitName,
    int? CompanyId,
    string CompanyTitle,
    int? WarehouseId,
    string? WarehouseTitle,
    decimal Quantity,
    decimal AverageCost,
    decimal Value
);

/// <summary>ارزش موجودی از تراز میانگین موزون؛ فقط کالاهایی که مقدار یا ارزش دارند</summary>
public record GetStockValuationQuery : PaginatedRequest, IRequest<PaginatedResult<StockValuationDto>>
{
    public int? CompanyId { get; set; }
    public int? WarehouseId { get; set; }
}

public class GetStockValuationHandler : IRequestHandler<GetStockValuationQuery, PaginatedResult<StockValuationDto>>
{
    private static readonly Dictionary<string, string> Columns = new(StringComparer.OrdinalIgnoreCase)
    {
        ["productCode"] = "ProductCode",
        ["productName"] = "ProductName",
        ["companyTitle"] = "CompanyTitle",
        ["warehouseTitle"] = "WarehouseTitle",
        ["quantity"] = "Quantity",
        ["value"] = "Value",
    };

    private readonly IApplicationDbContext _context;
    private readonly IWarehouseAccessService _access;

    public GetStockValuationHandler(IApplicationDbContext context, IWarehouseAccessService access)
    {
        _context = context;
        _access = access;
    }

    public async Task<PaginatedResult<StockValuationDto>> Handle(GetStockValuationQuery request, CancellationToken cancellationToken)
    {
        var query =
            from b in _context.InventoryCostBalances.AsNoTracking()
            join p in _context.Products on b.ProductId equals p.Id
            join c in _context.Companies on b.CompanyId equals c.Id into cs
            from c in cs.DefaultIfEmpty()
            join w in _context.Warehouses on b.WarehouseId equals w.Id into ws
            from w in ws.DefaultIfEmpty()
            where b.Quantity != 0 || b.Value != 0
            select new
            {
                b.Id, b.ProductId, ProductCode = p.Code, ProductName = p.Name, UnitName = p.Unit != null ? p.Unit.Title : "",
                b.CompanyId, CompanyTitle = c != null ? c.Title : "بدون شرکت",
                b.WarehouseId, WarehouseTitle = w != null ? w.Title : null,
                b.Quantity, b.Value
            };

        // در سطح «انبار» قاعده دسترسی انبار اعمال می‌شود؛ تراز سطح «شرکت» با مجوز همین گزارش دیده می‌شود
        var allowed = await _access.GetAllowedWarehouseIdsAsync(cancellationToken);
        if (allowed != null) query = query.Where(x => x.WarehouseId == null || allowed.Contains(x.WarehouseId.Value));
        if (request.CompanyId.HasValue) query = query.Where(x => x.CompanyId == request.CompanyId);
        if (request.WarehouseId.HasValue) query = query.Where(x => x.WarehouseId == request.WarehouseId);
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim();
            query = query.Where(x => x.ProductCode.Contains(term) || x.ProductName.Contains(term));
        }

        if (request.Filters != null)
            foreach (var f in request.Filters)
                if (Columns.TryGetValue(f.PropertyName, out var mapped)) f.PropertyName = mapped;
        query = query.ApplyDynamicFilters(request.Filters);
        query = !string.IsNullOrEmpty(request.SortColumn) && Columns.TryGetValue(request.SortColumn, out var sort)
            ? query.OrderByNatural(sort, request.SortDescending)
            : query.OrderBy(x => x.ProductCode);

        var page = await query.ToPaginatedListAsync(request.PageNumber, request.PageSize, cancellationToken);
        var items = page.Items.Select(x => new StockValuationDto(x.Id, x.ProductId, x.ProductCode, x.ProductName, x.UnitName,
            x.CompanyId, x.CompanyTitle, x.WarehouseId, x.WarehouseTitle, x.Quantity,
            x.Quantity > 0 ? Math.Round(x.Value / x.Quantity, 4, MidpointRounding.AwayFromZero) : 0,
            Math.Round(x.Value, 0, MidpointRounding.AwayFromZero))).ToList();
        return new PaginatedResult<StockValuationDto>(items, page.TotalCount, page.PageNumber, request.PageSize);
    }
}
