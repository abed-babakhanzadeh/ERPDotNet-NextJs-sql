using System.Linq.Expressions;
using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Queries.GetCostCenters;

public record CostCenterDto(
    int Id,
    string Code,
    string Title,
    CostCenterType Type,
    int? ParentId,
    string? ParentTitle,
    bool IsActive,
    byte[] RowVersion
);

public record GetCostCentersQuery : PaginatedRequest, IRequest<PaginatedResult<CostCenterDto>>;

public record GetCostCentersLookupQuery : IRequest<List<CostCenterDto>>;

public record GetCostCenterByIdQuery(int Id) : IRequest<CostCenterDto?>;

public class GetCostCentersHandler :
    IRequestHandler<GetCostCentersQuery, PaginatedResult<CostCenterDto>>,
    IRequestHandler<GetCostCentersLookupQuery, List<CostCenterDto>>,
    IRequestHandler<GetCostCenterByIdQuery, CostCenterDto?>
{
    private readonly IApplicationDbContext _context;

    public GetCostCentersHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<CostCenterDto>> Handle(GetCostCentersQuery request, CancellationToken cancellationToken)
    {
        var query = _context.CostCenters.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            query = query.Where(x => x.Title.Contains(request.SearchTerm) || x.Code.Contains(request.SearchTerm));

        if (request.Filters != null)
        {
            foreach (var f in request.Filters.Where(f => f.PropertyName.Equals("ParentTitle", StringComparison.OrdinalIgnoreCase)))
                f.PropertyName = "Parent.Title";
        }
        query = query.ApplyDynamicFilters(request.Filters);

        var sortColumn = string.Equals(request.SortColumn, "ParentTitle", StringComparison.OrdinalIgnoreCase)
            ? "Parent.Title"
            : request.SortColumn;
        query = string.IsNullOrEmpty(sortColumn)
            ? query.OrderByNatural("Code", false)
            : query.OrderByNatural(sortColumn, request.SortDescending);

        return await query.Select(ToDto).ToPaginatedListAsync(request.PageNumber, request.PageSize, cancellationToken);
    }

    public async Task<List<CostCenterDto>> Handle(GetCostCentersLookupQuery request, CancellationToken cancellationToken)
    {
        return await _context.CostCenters
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Code)
            .Select(ToDto)
            .ToListAsync(cancellationToken);
    }

    public async Task<CostCenterDto?> Handle(GetCostCenterByIdQuery request, CancellationToken cancellationToken)
    {
        return await _context.CostCenters
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
            .Select(ToDto)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static readonly Expression<Func<CostCenter, CostCenterDto>> ToDto =
        x => new CostCenterDto(
            x.Id, x.Code, x.Title, x.Type, x.ParentId,
            x.Parent != null ? x.Parent.Title : null, x.IsActive, x.RowVersion ?? new byte[0]);
}
