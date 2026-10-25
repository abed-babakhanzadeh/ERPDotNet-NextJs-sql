using System.Linq.Expressions;
using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Queries.GetProductCategories;

public record ProductCategoryDto(
    int Id,
    string Code,
    string Title,
    int? ParentId,
    string? ParentTitle,
    bool IsActive,
    byte[] RowVersion
);

public record GetProductCategoriesQuery : PaginatedRequest, IRequest<PaginatedResult<ProductCategoryDto>>;

public record GetProductCategoriesLookupQuery : IRequest<List<ProductCategoryDto>>;

public record GetProductCategoryByIdQuery(int Id) : IRequest<ProductCategoryDto?>;

public class GetProductCategoriesHandler :
    IRequestHandler<GetProductCategoriesQuery, PaginatedResult<ProductCategoryDto>>,
    IRequestHandler<GetProductCategoriesLookupQuery, List<ProductCategoryDto>>,
    IRequestHandler<GetProductCategoryByIdQuery, ProductCategoryDto?>
{
    private readonly IApplicationDbContext _context;

    public GetProductCategoriesHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<ProductCategoryDto>> Handle(GetProductCategoriesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.ProductCategories.AsNoTracking();

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

    public async Task<List<ProductCategoryDto>> Handle(GetProductCategoriesLookupQuery request, CancellationToken cancellationToken)
    {
        return await _context.ProductCategories
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Code)
            .Select(ToDto)
            .ToListAsync(cancellationToken);
    }

    public async Task<ProductCategoryDto?> Handle(GetProductCategoryByIdQuery request, CancellationToken cancellationToken)
    {
        return await _context.ProductCategories
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
            .Select(ToDto)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static readonly Expression<Func<ProductCategory, ProductCategoryDto>> ToDto =
        x => new ProductCategoryDto(
            x.Id, x.Code, x.Title, x.ParentId,
            x.Parent != null ? x.Parent.Title : null, x.IsActive, x.RowVersion ?? new byte[0]);
}
