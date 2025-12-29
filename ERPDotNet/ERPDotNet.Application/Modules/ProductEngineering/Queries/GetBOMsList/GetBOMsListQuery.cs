using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.ProductEngineering.Queries.GetBOMsList;

public record BOMListDto(
    int Id,
    int ProductId,
    string ProductName,
    string ProductCode,
    string? ProductDescription, // <--- اضافه شد
    int Version,
    string Title,
    string Usage,
    string Type,
    string Status,
    bool IsActive,
    string FromDate,
    byte[] RowVersion // <--- برای عملیات حذف/ویرایش سریع از گرید
);

[Cached(timeToLiveSeconds: 300, "BOMs")]
public record GetBOMsListQuery : PaginatedRequest, IRequest<PaginatedResult<BOMListDto>>;

public class GetBOMsListHandler : IRequestHandler<GetBOMsListQuery, PaginatedResult<BOMListDto>>
{
    private readonly IApplicationDbContext _context;

    public GetBOMsListHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<BOMListDto>> Handle(GetBOMsListQuery request, CancellationToken cancellationToken)
    {
        var query = _context.BOMHeaders
            .AsNoTracking()
            .Include(x => x.Product)
            .AsQueryable();

        // 1. جستجوی پیشرفته (شامل توضیحات)
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim();
            query = query.Where(x => 
                x.Title.Contains(term) || 
                x.Product!.Name.Contains(term) ||
                x.Product.Code.Contains(term) ||
                (x.Product.Descriptions != null && x.Product.Descriptions.Contains(term)) // <--- سرچ در توضیحات
            );
        }

        // 2. مپینگ فیلترها (اصلاح نام‌ها)
        if (request.Filters != null && request.Filters.Any())
        {
            foreach (var filter in request.Filters)
            {
                filter.PropertyName = filter.PropertyName switch
                {
                    "productCode" => "Product.Code",
                    "productName" => "Product.Name",
                    "title" => "Title",
                    "version" => "Version",
                    "type" => "Type", // Enum Handling is automatic in FilterExtensions
                    "status" => "Status",
                    "isActive" => "IsActive",
                    "fromDate" => "FromDate",
                    _ => filter.PropertyName
                };
            }
        }

        query = query.ApplyDynamicFilters(request.Filters);

        // 3. سورت
        string? mappedSortColumn = request.SortColumn switch
        {
            "productCode" => "Product.Code",
            "productName" => "Product.Name",
            "title" => "Title",
            "version" => "Version",
            "type" => "Type",
            "status" => "Status",
            "isActive" => "IsActive",
            "fromDate" => "FromDate",
            _ => request.SortColumn
        };

        if (!string.IsNullOrEmpty(mappedSortColumn))
        {
            query = query.OrderByNatural(mappedSortColumn, request.SortDescending);
        }
        else
        {
            query = query.OrderByDescending(x => x.Id);
        }

        // 4. پیجینگ و مپینگ
        var totalCount = await query.CountAsync(cancellationToken);
        
        var items = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(x => new BOMListDto(
                x.Id,
                x.ProductId,
                x.Product!.Name,
                x.Product.Code,
                x.Product.Descriptions, // <--- پر کردن توضیحات
                x.Version,
                x.Usage.ToDisplay(),
                x.Title,
                x.Type.ToDisplay(),
                x.Status.ToDisplay(),
                x.IsActive,
                x.FromDate.ToShortDateString(),
                x.RowVersion ?? new byte[0]
            ))
            .ToListAsync(cancellationToken);

        return new PaginatedResult<BOMListDto>(items, totalCount, request.PageNumber, request.PageSize);
    }
}