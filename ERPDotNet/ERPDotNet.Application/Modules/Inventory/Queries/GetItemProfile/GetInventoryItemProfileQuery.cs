using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Queries.GetItemProfile;

public record GetInventoryItemProfileQuery(int ProductId) : IRequest<InventoryItemProfileDto?>;

public class GetInventoryItemProfileHandler : IRequestHandler<GetInventoryItemProfileQuery, InventoryItemProfileDto?>
{
    private readonly IApplicationDbContext _context;

    public GetInventoryItemProfileHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<InventoryItemProfileDto?> Handle(GetInventoryItemProfileQuery request, CancellationToken cancellationToken)
    {
        var entity = await _context.InventoryItemProfiles
            .AsNoTracking()
            .Include(x => x.MainInventoryUnit)
            .Include(x => x.WarehouseSettings)
                .ThenInclude(ws => ws.Warehouse)
            .Include(x => x.WarehouseSettings)
                .ThenInclude(ws => ws.DefaultLocation)
            .FirstOrDefaultAsync(x => x.ProductId == request.ProductId, cancellationToken);

        if (entity == null) return null;

        return new InventoryItemProfileDto
        {
            Id = entity.Id,
            ProductId = entity.ProductId,
            IsBatchManaged = entity.IsBatchManaged,
            IsSerialManaged = entity.IsSerialManaged,
            ShelfLifeDays = entity.ShelfLifeDays,
            MainInventoryUnitId = entity.MainInventoryUnitId,
            MainInventoryUnitTitle = entity.MainInventoryUnit?.Title ?? "",
            WarehouseSettings = entity.WarehouseSettings
                .Where(ws => !ws.IsDeleted && (ws.Warehouse == null || ws.Warehouse.IsActive))
                .Select(ws => new ItemWarehouseSettingDto
                {
                    Id = ws.Id,
                    WarehouseId = ws.WarehouseId,
                    WarehouseTitle = ws.Warehouse?.Title ?? "ناشناس",
                    MinStock = ws.MinStock,
                    MaxStock = ws.MaxStock,
                    ReorderPoint = ws.ReorderPoint,
                    DefaultLocationId = ws.DefaultLocationId,
                    DefaultLocationTitle = ws.DefaultLocation?.Title,
                    DefaultLocationCode = ws.DefaultLocation?.Code
                })
                .ToList()
        };
    }
}