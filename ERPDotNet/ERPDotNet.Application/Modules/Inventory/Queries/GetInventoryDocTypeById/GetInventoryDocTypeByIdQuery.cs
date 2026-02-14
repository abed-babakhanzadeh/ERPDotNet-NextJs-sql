using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.DTOs;
using ERPDotNet.Application.Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Queries.GetInventoryDocTypeById;

public record GetInventoryDocTypeByIdQuery(int Id) : IRequest<InventoryDocTypeDto>;

public class GetInventoryDocTypeByIdHandler : IRequestHandler<GetInventoryDocTypeByIdQuery, InventoryDocTypeDto>
{
    private readonly IApplicationDbContext _context;

    public GetInventoryDocTypeByIdHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<InventoryDocTypeDto> Handle(GetInventoryDocTypeByIdQuery request, CancellationToken cancellationToken)
    {
        var entity = await _context.InventoryDocTypes
            .AsNoTracking()
            .Include(x => x.AllowedReferences)
            .FirstOrDefaultAsync(x => x.Id == request.Id && !x.IsDeleted, cancellationToken);

        if (entity == null) throw new Exception("نوع سند یافت نشد.");

        return new InventoryDocTypeDto
        {
            Id = entity.Id,
            Title = entity.Title,
            Nature = entity.Nature.ToDisplay(),
            NatureValue = entity.Nature,
            ParentId = entity.ParentId,
            RequiredPermissionName = entity.RequiredPermissionName,
            AffectsCost = entity.AffectsCost,
            NumberingScope = entity.NumberingScope,
            IsReferenceRequired = entity.IsReferenceRequired,
            AllowedReferenceEntityNames = entity.AllowedReferences.Select(r => r.ReferenceEntityName).ToList(),
            RowVersion = Convert.ToBase64String(entity.RowVersion!)
        };
    }
}