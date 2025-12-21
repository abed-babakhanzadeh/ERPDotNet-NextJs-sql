using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.BaseInfo.Queries.GetAllProducts;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Queries.GetProductById;

public class GetProductByIdQueryHandler : IRequestHandler<GetProductByIdQuery, ProductDto?>
{
    private readonly IApplicationDbContext _context;

    public GetProductByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ProductDto?> Handle(GetProductByIdQuery request, CancellationToken cancellationToken)
    {
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.Id == request.Id)
            .Select(p => new ProductDto(
                p.Id,
                p.Code,
                p.Name,
                p.LatinName,
                p.Descriptions, // <--- فیلد جدید
                p.UnitId,
                p.Unit != null ? p.Unit.Title : "",
                (int)p.SupplyType,
                p.SupplyType.ToDisplay(),
                p.ImagePath,
                p.RowVersion ?? new byte[0], // <--- ارسال RowVersion برای ادیت
                p.UnitConversions.Select(c => new ProductConversionDto(
                    c.Id,
                    c.AlternativeUnitId,
                    c.AlternativeUnit != null ? c.AlternativeUnit.Title : "",
                    c.Factor
                )).ToList()
            ))
            .FirstOrDefaultAsync(cancellationToken);
    }
}