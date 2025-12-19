using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.BaseInfo.Queries.GetAllUnits; 
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Queries.GetUnitById;

public record GetUnitByIdQuery(int Id) : IRequest<UnitDto?>;

public class GetUnitByIdHandler : IRequestHandler<GetUnitByIdQuery, UnitDto?>
{
    private readonly IApplicationDbContext _context;

    public GetUnitByIdHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<UnitDto?> Handle(GetUnitByIdQuery request, CancellationToken cancellationToken)
    {
        return await _context.Units
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
            .Select(x => new UnitDto(
                x.Id,
                x.Title,
                x.Symbol,
                x.Precision,
                x.IsActive,
                x.BaseUnitId,
                x.ConversionFactor,
                x.BaseUnit != null ? x.BaseUnit.Title : null,
                x.RowVersion ?? new byte[0] // <--- اضافه شده
            ))
            .FirstOrDefaultAsync(cancellationToken);
    }
}