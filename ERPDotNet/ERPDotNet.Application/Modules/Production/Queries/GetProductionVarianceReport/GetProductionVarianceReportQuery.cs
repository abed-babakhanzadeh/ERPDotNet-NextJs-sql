using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.Inventory.Contracts;
using ERPDotNet.Application.Modules.Production.Services;
using ERPDotNet.Domain.Modules.Production.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Production.Queries.GetProductionVarianceReport;

/// <summary>
/// خلاصه انحراف مقداری یک سفارش. مواد واحدهای متفاوت دارند و جمع‌پذیر نیستند،
/// پس فقط تعداد مواد بیش از مجاز و بیشترین انحراف درصدی نشان داده می‌شود؛ جزئیات در صفحه سفارش است.
/// </summary>
public record ProductionVarianceSummaryDto(
    int Id,
    string OrderNumber,
    string ProductCode,
    string ProductName,
    string UnitName,
    int StatusId,
    string StatusTitle,
    decimal Quantity,
    decimal GoodQuantity,
    decimal ScrapQuantity,
    decimal? YieldPercent,
    int MaterialCount,
    int OverAllowedCount,
    decimal? MaxVariancePercent,
    bool HasOpenDocs
);

/// <summary>سفارش‌های در حال تولید و تکمیل‌شده؛ فقط اسناد قطعی در انحراف حساب می‌شوند</summary>
public record GetProductionVarianceReportQuery : PaginatedRequest, IRequest<PaginatedResult<ProductionVarianceSummaryDto>>
{
    public ProductionOrderStatus? Status { get; set; }
    public bool OverAllowedOnly { get; set; }
}

public class GetProductionVarianceReportHandler
    : IRequestHandler<GetProductionVarianceReportQuery, PaginatedResult<ProductionVarianceSummaryDto>>
{
    private static readonly Dictionary<string, string> Columns = new(StringComparer.OrdinalIgnoreCase)
    {
        ["orderNumber"] = "OrderNumber",
        ["productCode"] = "Product.Code",
        ["productName"] = "Product.Name",
        ["quantity"] = "Quantity",
        ["statusId"] = "Status",
    };

    private readonly IApplicationDbContext _context;
    private readonly IInventoryReferenceReader _inventory;

    public GetProductionVarianceReportHandler(IApplicationDbContext context, IInventoryReferenceReader inventory)
    {
        _context = context;
        _inventory = inventory;
    }

    public async Task<PaginatedResult<ProductionVarianceSummaryDto>> Handle(
        GetProductionVarianceReportQuery request, CancellationToken cancellationToken)
    {
        var query = _context.ProductionOrders.AsNoTracking()
            .Where(o => o.Status == ProductionOrderStatus.InProgress || o.Status == ProductionOrderStatus.Completed);
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

        var orders = query.Select(o => new
        {
            o.Id,
            o.OrderNumber,
            o.ProductId,
            ProductCode = o.Product!.Code,
            ProductName = o.Product.Name,
            UnitName = o.Product.Unit != null ? o.Product.Unit.Title : "",
            o.Status,
            o.Quantity
        });

        // «فقط بیش از مجاز» به محاسبه روی اسناد انبار نیاز دارد و در SQL قابل فیلتر نیست؛
        // در این حالت همه سفارش‌های فیلترشده محاسبه و سپس صفحه‌بندی می‌شوند
        var page = request.OverAllowedOnly
            ? null
            : await orders.ToPaginatedListAsync(request.PageNumber, request.PageSize, cancellationToken);
        var candidates = page?.Items ?? await orders.ToListAsync(cancellationToken);

        var ids = candidates.Select(o => o.Id).ToList();
        var lines = (await _inventory.GetLinesAsync(ProductionProgress.ReferenceName, ids.Select(i => (long)i).ToList(), cancellationToken))
            .ToLookup(l => l.ReferenceEntityId);
        var planned = (await _context.ProductionOrderMaterials
                .AsNoTracking()
                .Where(m => ids.Contains(m.ProductionOrderId))
                .OrderBy(m => m.Id)
                .Select(m => new { m.ProductionOrderId, Material = new ProductionProgress.PlannedMaterial(m.Id, m.ProductId, m.StandardQuantity, m.RequiredQuantity) })
                .ToListAsync(cancellationToken))
            .ToLookup(m => m.ProductionOrderId, m => m.Material);

        var rows = candidates.Select(o =>
        {
            var progress = ProductionProgress.Compute(o.ProductId, lines[o.Id]);
            var materials = ProductionProgress.Materials(planned[o.Id].ToList(), progress, o.Quantity);
            var percents = materials.Where(m => m.VariancePercent.HasValue).Select(m => m.VariancePercent!.Value).ToList();
            return new ProductionVarianceSummaryDto(
                o.Id, o.OrderNumber, o.ProductCode, o.ProductName, o.UnitName,
                (int)o.Status, o.Status.ToDisplay(), o.Quantity,
                progress.Output.Done, progress.Scrap.Done, ProductionProgress.YieldPercent(progress),
                materials.Count, materials.Count(m => m.OverAllowed),
                percents.Count == 0 ? null : percents.MaxBy(Math.Abs),
                progress.HasOpenDocs);
        }).ToList();

        if (page != null)
            return new PaginatedResult<ProductionVarianceSummaryDto>(rows, page.TotalCount, page.PageNumber, request.PageSize);

        var over = rows.Where(r => r.OverAllowedCount > 0).ToList();
        var pageNumber = Math.Max(1, request.PageNumber);
        return new PaginatedResult<ProductionVarianceSummaryDto>(
            over.Skip((pageNumber - 1) * request.PageSize).Take(request.PageSize).ToList(),
            over.Count, pageNumber, request.PageSize);
    }
}
