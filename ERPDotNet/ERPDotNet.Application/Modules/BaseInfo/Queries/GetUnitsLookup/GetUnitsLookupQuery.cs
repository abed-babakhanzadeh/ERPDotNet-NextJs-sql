using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Queries.GetAllUnits;

[Cached(timeToLiveSeconds: 3600, "UnitsLookup")] 
public record GetUnitsLookupQuery : IRequest<List<UnitDto>>;

public class GetUnitsLookupHandler : IRequestHandler<GetUnitsLookupQuery, List<UnitDto>>
{
    private readonly IApplicationDbContext _context;

    public GetUnitsLookupHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<UnitDto>> Handle(GetUnitsLookupQuery request, CancellationToken cancellationToken)
    {
        return await _context.Units
            .AsNoTracking()
            .Where(x => x.IsActive) 
            .OrderBy(x => x.Id)
            .Select(x => new UnitDto(
                x.Id, 
                x.Title, 
                x.Symbol, 
                x.Precision,
                x.IsActive,
                x.BaseUnitId,
                x.ConversionFactor, 
                x.BaseUnit != null ? x.BaseUnit.Title : null,
                x.RowVersion ?? new byte[0] // <--- برای Lookup معمولا لازم نیست ولی چون DTO مشترک است باید پر شود
            ))
            .ToListAsync(cancellationToken);
    }
}