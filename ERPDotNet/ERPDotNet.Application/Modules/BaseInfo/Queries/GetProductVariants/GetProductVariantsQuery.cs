using ERPDotNet.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Queries.GetProductVariants;

public record ProductVariantDto(int Id, string Code, string Name, bool IsActive, List<string> Values);

public record GetProductVariantsQuery(int ProductId) : IRequest<List<ProductVariantDto>>;

public class GetProductVariantsHandler : IRequestHandler<GetProductVariantsQuery, List<ProductVariantDto>>
{
    private readonly IApplicationDbContext _context;

    public GetProductVariantsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductVariantDto>> Handle(GetProductVariantsQuery request, CancellationToken cancellationToken)
    {
        var rows = await _context.Products
            .AsNoTracking()
            .Where(p => p.VariantParentId == request.ProductId)
            .OrderBy(p => p.Code)
            .Select(p => new
            {
                p.Id,
                p.Code,
                p.Name,
                p.IsActive,
                Values = p.VariantValues
                    .OrderBy(v => v.AttributeValue!.Attribute!.Code)
                    .Select(v => v.AttributeValue!.Attribute!.Title + ": " + v.AttributeValue.Title)
                    .ToList()
            })
            .ToListAsync(cancellationToken);

        return rows.Select(r => new ProductVariantDto(r.Id, r.Code, r.Name, r.IsActive, r.Values)).ToList();
    }
}
