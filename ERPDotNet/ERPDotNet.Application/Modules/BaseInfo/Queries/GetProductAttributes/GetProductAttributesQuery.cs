using System.Linq.Expressions;
using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Queries.GetProductAttributes;

public record ProductAttributeValueDto(int Id, string Code, string Title);

public record ProductAttributeDto(
    int Id,
    string Code,
    string Title,
    bool IsActive,
    List<ProductAttributeValueDto> Values,
    byte[] RowVersion
);

public record GetProductAttributesQuery : PaginatedRequest, IRequest<PaginatedResult<ProductAttributeDto>>;

public record GetProductAttributesLookupQuery : IRequest<List<ProductAttributeDto>>;

public record GetProductAttributeByIdQuery(int Id) : IRequest<ProductAttributeDto?>;

public class GetProductAttributesHandler :
    IRequestHandler<GetProductAttributesQuery, PaginatedResult<ProductAttributeDto>>,
    IRequestHandler<GetProductAttributesLookupQuery, List<ProductAttributeDto>>,
    IRequestHandler<GetProductAttributeByIdQuery, ProductAttributeDto?>
{
    private readonly IApplicationDbContext _context;

    public GetProductAttributesHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<ProductAttributeDto>> Handle(GetProductAttributesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.ProductAttributes.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            query = query.Where(x => x.Title.Contains(request.SearchTerm) || x.Code.Contains(request.SearchTerm)
                || x.Values.Any(v => v.Title.Contains(request.SearchTerm)));

        query = query.ApplyDynamicFilters(request.Filters);
        query = string.IsNullOrEmpty(request.SortColumn)
            ? query.OrderByNatural("Code", false)
            : query.OrderByNatural(request.SortColumn, request.SortDescending);

        return await query.Select(ToDto).ToPaginatedListAsync(request.PageNumber, request.PageSize, cancellationToken);
    }

    public async Task<List<ProductAttributeDto>> Handle(GetProductAttributesLookupQuery request, CancellationToken cancellationToken)
    {
        return await _context.ProductAttributes
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Code)
            .Select(ToDto)
            .ToListAsync(cancellationToken);
    }

    public async Task<ProductAttributeDto?> Handle(GetProductAttributeByIdQuery request, CancellationToken cancellationToken)
    {
        return await _context.ProductAttributes
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
            .Select(ToDto)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static readonly Expression<Func<ProductAttribute, ProductAttributeDto>> ToDto =
        x => new ProductAttributeDto(
            x.Id, x.Code, x.Title, x.IsActive,
            x.Values.OrderBy(v => v.SortOrder).Select(v => new ProductAttributeValueDto(v.Id, v.Code, v.Title)).ToList(),
            x.RowVersion ?? new byte[0]);
}
