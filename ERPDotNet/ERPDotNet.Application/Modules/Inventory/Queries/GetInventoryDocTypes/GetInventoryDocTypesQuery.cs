using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Extensions; // برای ToDisplay() اکستنشن Enum
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Queries.GetInventoryDocTypes;

// کش کردن لیست چون به ندرت تغییر می‌کند
[Cached(timeToLiveSeconds: 3600, "InventoryDocTypes")]
public record GetInventoryDocTypesQuery : IRequest<List<InventoryDocTypeDto>>;

public class GetInventoryDocTypesHandler : IRequestHandler<GetInventoryDocTypesQuery, List<InventoryDocTypeDto>>
{
    private readonly IApplicationDbContext _context;

    public GetInventoryDocTypesHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<InventoryDocTypeDto>> Handle(GetInventoryDocTypesQuery request, CancellationToken cancellationToken)
    {
        return await _context.InventoryDocTypes
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .Include(x => x.Parent)
            .Include(x => x.AllowedReferences)
            .OrderBy(x => x.Id)
            .Select(x => new InventoryDocTypeDto
            {
                Id = x.Id,
                Title = x.Title,
                Nature = x.Nature.ToDisplay(), // تبدیل به فارسی
                NatureValue = x.Nature,
                ParentId = x.ParentId,
                ParentTitle = x.Parent != null ? x.Parent.Title : null,
                RequiredPermissionName = x.RequiredPermissionName,
                AffectsCost = x.AffectsCost,
                NumberingScope = x.NumberingScope,
                IsReferenceRequired = x.IsReferenceRequired,
                AllowedReferenceEntityNames = x.AllowedReferences.Select(r => r.ReferenceEntityName).ToList(),
                RowVersion = Convert.ToBase64String(x.RowVersion!)
            })
            .ToListAsync(cancellationToken);
    }
}