using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Queries.GetAllUnits;

public record UnitDto(
    int Id, 
    string Title, 
    string Symbol, 
    int Precision,
    bool IsActive,
    int? BaseUnitId,
    decimal ConversionFactor, 
    string? BaseUnitName,
    byte[] RowVersion // <--- اضافه شده
);

[Cached(timeToLiveSeconds: 600, "Units")] 
public record GetAllUnitsQuery : PaginatedRequest, IRequest<PaginatedResult<UnitDto>>;

public class GetAllUnitsHandler : IRequestHandler<GetAllUnitsQuery, PaginatedResult<UnitDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAllUnitsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<UnitDto>> Handle(GetAllUnitsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Units
            .AsNoTracking()
            .AsQueryable(); // Include نیاز نیست چون Select می‌زنیم

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            query = query.Where(u => u.Title.Contains(request.SearchTerm) || u.Symbol.Contains(request.SearchTerm));
        }
        
        if (request.Filters != null)
        {
            var baseUnitNameFilter = request.Filters.FirstOrDefault(f => f.PropertyName.Equals("BaseUnitName", StringComparison.OrdinalIgnoreCase));
            if (baseUnitNameFilter != null)
            {
                baseUnitNameFilter.PropertyName = "BaseUnit.Title";
            }
        }

        query = query.ApplyDynamicFilters(request.Filters);

        var sortColumn = request.SortColumn;
        if (string.Equals(sortColumn, "BaseUnitName", StringComparison.OrdinalIgnoreCase))
        {
            sortColumn = "BaseUnit.Title";
        }

        if (!string.IsNullOrEmpty(sortColumn))
        {
            query = query.OrderByNatural(sortColumn, request.SortDescending);
        }
        else
        {
            query = query.OrderByNatural("Id", false);
        }

        var dtoQuery = query.Select(x => new UnitDto(
            x.Id, 
            x.Title, 
            x.Symbol, 
            x.Precision,
            x.IsActive,
            x.BaseUnitId,
            x.ConversionFactor, 
            x.BaseUnit != null ? x.BaseUnit.Title : null,
            x.RowVersion ?? new byte[0] // <--- مقداردهی
        ));

        return await dtoQuery.ToPaginatedListAsync(request.PageNumber, request.PageSize, cancellationToken);
    }
}