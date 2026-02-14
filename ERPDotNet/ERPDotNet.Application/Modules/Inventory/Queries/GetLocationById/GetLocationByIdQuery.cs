using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Queries.GetLocationById;

public record GetLocationByIdQuery(int Id) : IRequest<LocationDto>;

public class GetLocationByIdQueryHandler : IRequestHandler<GetLocationByIdQuery, LocationDto>
{
    private readonly IApplicationDbContext _context;

    public GetLocationByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<LocationDto> Handle(GetLocationByIdQuery request, CancellationToken cancellationToken)
    {
        var entity = await _context.Locations
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.Id && !x.IsDeleted, cancellationToken);

        if (entity == null)
            throw new Exception("لوکیشن مورد نظر یافت نشد.");

        return new LocationDto
        {
            Id = entity.Id,
            Title = entity.Title!,
            Code = entity.Code,
            ParentId = entity.ParentId,
            Path = entity.Path,
            IsBlocked = entity.IsBlocked,
            Level = entity.Path.Length - entity.Path.Replace("/", "").Length,
            RowVersion = Convert.ToBase64String(entity.RowVersion!)
        };
    }
}