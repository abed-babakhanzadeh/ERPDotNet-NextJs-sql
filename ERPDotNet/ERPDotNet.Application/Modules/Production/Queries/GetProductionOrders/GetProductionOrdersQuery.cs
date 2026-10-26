using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Domain.Modules.Production.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Production.Queries.GetProductionOrders;

public record ProductionOrderListDto(
    int Id,
    string OrderNumber,
    int ProductId,
    string ProductCode,
    string ProductName,
    string UnitName,
    int BOMHeaderId,
    string BomTitle,
    int BomVersion,
    decimal Quantity,
    DateTime? PlannedStartDate,
    DateTime? PlannedEndDate,
    int StatusId,
    string StatusTitle,
    string? Description
);

public record ProductionOrderMaterialDto(
    int Id,
    int ProductId,
    string ProductCode,
    string ProductName,
    string UnitName,
    decimal StandardQuantity,
    decimal WastePercentage,
    decimal RequiredQuantity
);

public record ProductionOrderDto(
    int Id,
    string OrderNumber,
    int ProductId,
    string ProductCode,
    string ProductName,
    string UnitName,
    int BOMHeaderId,
    string BomTitle,
    int BomVersion,
    decimal BomBaseQuantity,
    decimal Quantity,
    DateTime? PlannedStartDate,
    DateTime? PlannedEndDate,
    int StatusId,
    string StatusTitle,
    string? Description,
    List<ProductionOrderMaterialDto> Materials,
    byte[] RowVersion
);

public record GetProductionOrdersQuery : PaginatedRequest, IRequest<PaginatedResult<ProductionOrderListDto>>
{
    public ProductionOrderStatus? Status { get; set; }
}

public record GetProductionOrderByIdQuery(int Id) : IRequest<ProductionOrderDto?>;

public class GetProductionOrdersHandler :
    IRequestHandler<GetProductionOrdersQuery, PaginatedResult<ProductionOrderListDto>>,
    IRequestHandler<GetProductionOrderByIdQuery, ProductionOrderDto?>
{
    private static readonly Dictionary<string, string> Columns = new(StringComparer.OrdinalIgnoreCase)
    {
        ["orderNumber"] = "OrderNumber",
        ["productCode"] = "Product.Code",
        ["productName"] = "Product.Name",
        ["bomTitle"] = "BOMHeader.Title",
        ["quantity"] = "Quantity",
        ["plannedStartDate"] = "PlannedStartDate",
        ["plannedEndDate"] = "PlannedEndDate",
        ["statusId"] = "Status",
        ["description"] = "Description",
    };

    private readonly IApplicationDbContext _context;

    public GetProductionOrdersHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<ProductionOrderListDto>> Handle(GetProductionOrdersQuery request, CancellationToken cancellationToken)
    {
        var query = _context.ProductionOrders.AsNoTracking();
        if (request.Status.HasValue) query = query.Where(o => o.Status == request.Status);

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim();
            query = query.Where(o => o.OrderNumber.Contains(term)
                || o.Product!.Code.Contains(term) || o.Product.Name.Contains(term));
        }

        if (request.Filters != null)
            foreach (var f in request.Filters)
                if (Columns.TryGetValue(f.PropertyName, out var mapped)) f.PropertyName = mapped;
        query = query.ApplyDynamicFilters(request.Filters);

        query = !string.IsNullOrEmpty(request.SortColumn) && Columns.TryGetValue(request.SortColumn, out var sort)
            ? query.OrderByNatural(sort, request.SortDescending)
            : query.OrderByDescending(o => o.Id);

        var page = await query
            .Select(o => new
            {
                o.Id,
                o.OrderNumber,
                o.ProductId,
                ProductCode = o.Product!.Code,
                ProductName = o.Product.Name,
                UnitName = o.Product.Unit != null ? o.Product.Unit.Title : "",
                o.BOMHeaderId,
                BomTitle = o.BOMHeader!.Title,
                BomVersion = o.BOMHeader.Version,
                o.Quantity,
                o.PlannedStartDate,
                o.PlannedEndDate,
                o.Status,
                o.Description
            })
            .ToPaginatedListAsync(request.PageNumber, request.PageSize, cancellationToken);

        var items = page.Items.Select(o => new ProductionOrderListDto(
            o.Id, o.OrderNumber, o.ProductId, o.ProductCode, o.ProductName, o.UnitName,
            o.BOMHeaderId, o.BomTitle, o.BomVersion, o.Quantity, o.PlannedStartDate, o.PlannedEndDate,
            (int)o.Status, o.Status.ToDisplay(), o.Description)).ToList();

        return new PaginatedResult<ProductionOrderListDto>(items, page.TotalCount, page.PageNumber, request.PageSize);
    }

    public async Task<ProductionOrderDto?> Handle(GetProductionOrderByIdQuery request, CancellationToken cancellationToken)
    {
        var o = await _context.ProductionOrders
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
            .Select(x => new
            {
                x.Id,
                x.OrderNumber,
                x.ProductId,
                ProductCode = x.Product!.Code,
                ProductName = x.Product.Name,
                UnitName = x.Product.Unit != null ? x.Product.Unit.Title : "",
                x.BOMHeaderId,
                BomTitle = x.BOMHeader!.Title,
                BomVersion = x.BOMHeader.Version,
                BomBaseQuantity = x.BOMHeader.BaseQuantity,
                x.Quantity,
                x.PlannedStartDate,
                x.PlannedEndDate,
                x.Status,
                x.Description,
                x.RowVersion,
                Materials = x.Materials.OrderBy(m => m.Id).Select(m => new ProductionOrderMaterialDto(
                    m.Id, m.ProductId, m.Product!.Code, m.Product.Name,
                    m.Product.Unit != null ? m.Product.Unit.Title : "",
                    m.StandardQuantity, m.WastePercentage, m.RequiredQuantity)).ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        return o == null ? null : new ProductionOrderDto(
            o.Id, o.OrderNumber, o.ProductId, o.ProductCode, o.ProductName, o.UnitName,
            o.BOMHeaderId, o.BomTitle, o.BomVersion, o.BomBaseQuantity, o.Quantity,
            o.PlannedStartDate, o.PlannedEndDate, (int)o.Status, o.Status.ToDisplay(), o.Description,
            o.Materials, o.RowVersion ?? []);
    }
}
