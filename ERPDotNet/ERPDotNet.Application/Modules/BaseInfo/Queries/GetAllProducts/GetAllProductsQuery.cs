using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Models;

namespace ERPDotNet.Application.Modules.BaseInfo.Queries.GetAllProducts;

// DTO با فیلدهای جدید
public record ProductDto(
    int Id,
    string Code,
    string Name,
    string? Descriptions,
    int UnitId,
    string UnitName,
    int SupplyTypeId,
    string SupplyType,
    string? ImagePath,
    byte[] RowVersion,
    List<ProductConversionDto> Conversions
);

public record ProductConversionDto(
    int Id,
    int AlternativeUnitId,
    string AlternativeUnitName,
    decimal Factor
);

[Cached(timeToLiveSeconds: 600, "Products")]
public record GetAllProductsQuery : PaginatedRequest, IRequest<PaginatedResult<ProductDto>>;

public class GetAllProductsHandler : IRequestHandler<GetAllProductsQuery, PaginatedResult<ProductDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAllProductsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<ProductDto>> Handle(GetAllProductsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Products
            .AsNoTracking()
            .AsQueryable();

        // --- مدیریت فیلترهای خاص ---
        if (request.Filters != null)
        {
            // 1. نگاشت نام واحد (مپ کردن از DTO به Entity)
            var unitNameFilter = request.Filters.FirstOrDefault(f => f.PropertyName.Equals("unitName", StringComparison.OrdinalIgnoreCase));
            if (unitNameFilter != null)
            {
                unitNameFilter.PropertyName = "Unit.Title";
            }
            
        }

        // اعمال سایر فیلترهای داینامیک
        query = query.ApplyDynamicFilters(request.Filters);

        // جستجوی کلی (SearchBox)
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchLower = request.SearchTerm.ToLower();
            query = query.Where(p =>
                p.Name.ToLower().Contains(searchLower) ||
                p.Code.ToLower().Contains(searchLower) ||
                (p.Descriptions != null && p.Descriptions.ToLower().Contains(searchLower))); // جستجو در توضیحات
        }

        // سورت
        var sortColumn = request.SortColumn;
        if (string.Equals(sortColumn, "UnitName", StringComparison.OrdinalIgnoreCase))
        {
            sortColumn = "Unit.Title";
        }
        else if (string.Equals(sortColumn, "SupplyType", StringComparison.OrdinalIgnoreCase))
        {
            sortColumn = "SupplyType";
        }

        if (!string.IsNullOrEmpty(sortColumn))
        {
            query = query.OrderByNatural(sortColumn, request.SortDescending);
        }
        else
        {
            query = query.OrderByNatural("Code", false);
        }

        // پروجکشن (Select)
        var dtoQuery = query.Select(p => new ProductDto(
            p.Id,
            p.Code,
            p.Name,
            p.Descriptions,
            p.UnitId,
            p.Unit != null ? p.Unit.Title : "",
            (int)p.SupplyType,
            p.SupplyType.ToDisplay(),
            p.ImagePath,
            p.RowVersion ?? new byte[0], 
            p.UnitConversions.Select(c => new ProductConversionDto(
                c.Id,
                c.AlternativeUnitId,
                c.AlternativeUnit != null ? c.AlternativeUnit.Title : "",
                c.Factor
            )).ToList()
        ));

        return await dtoQuery.ToPaginatedListAsync(request.PageNumber, request.PageSize, cancellationToken);
    }
}