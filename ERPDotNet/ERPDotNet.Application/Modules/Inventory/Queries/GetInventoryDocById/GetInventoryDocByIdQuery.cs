using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.DTOs;
using ERPDotNet.Domain.Modules.Inventory.Enums; // برای InventoryNature
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Queries.GetInventoryDocById;

public record GetInventoryDocByIdQuery(long Id) : IRequest<InventoryDocDto?>;

public class GetInventoryDocByIdHandler : IRequestHandler<GetInventoryDocByIdQuery, InventoryDocDto?>
{
    private readonly IApplicationDbContext _context;

    public GetInventoryDocByIdHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<InventoryDocDto?> Handle(GetInventoryDocByIdQuery request, CancellationToken cancellationToken)
    {
        // 1. واکشی اطلاعات از دیتابیس
        var doc = await _context.InventoryDocHeaders
            .AsNoTracking()
            .Include(x => x.DocType)
            .Include(x => x.Warehouse)
            .Include(x => x.DestinationWarehouse)
            // اینکلود کردن جزئیات و روابط تو در تو
            .Include(x => x.Details)
                .ThenInclude(d => d.Product)
                    .ThenInclude(p => p!.Unit) 
            .Include(x => x.Details)
                .ThenInclude(d => d.Batch)
            .Include(x => x.Details)
                .ThenInclude(d => d.Location)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (doc == null) return null;

        // 2. نگاشت دستی (Manual Mapping) به جای Mapster
        var dto = new InventoryDocDto
        {
            Id = doc.Id,
            DocNumber = doc.DocNumber,
            DocDate = doc.DocDate,
            DocTypeId = doc.DocTypeId,
            DocTypeTitle = doc.DocType?.Title ?? string.Empty,
            Nature = doc.DocType?.Nature ?? InventoryNature.Input, // مقدار پیش‌فرض اگر تایپ نال بود
            
            WarehouseId = doc.WarehouseId,
            WarehouseTitle = doc.Warehouse?.Title ?? string.Empty,
            DestinationWarehouseId = doc.DestinationWarehouseId,
            DestinationWarehouseTitle = doc.DestinationWarehouse?.Title,

            Status = doc.Status,
            Description = doc.Description ?? string.Empty,

            ReferenceExternalCode = doc.ReferenceExternalCode,
            TargetPartyName = doc.TargetPartyName,

            // تبدیل RowVersion (byte[]) به رشته (Base64 String) برای فرانت
            RowVersion = doc.RowVersion != null ? Convert.ToBase64String(doc.RowVersion) : string.Empty,

            // نگاشت دستی لیست اقلام
            Details = doc.Details.Select(d => new InventoryDocDetailDto
            {
                Id = d.Id,
                ProductId = d.ProductId,
                ProductCode = d.Product?.Code ?? string.Empty,
                ProductName = d.Product?.Name ?? string.Empty,
                UnitTitle = d.Product?.Unit?.Title ?? string.Empty,
                
                MainUnitQuantity = d.MainUnitQuantity,
                SubUnitQuantity = d.SubUnitQuantity,
                
                LocationId = d.LocationId ?? 0,
                LocationCode = d.Location?.Code ?? string.Empty,
                
                BatchId = d.BatchId,
                BatchNumber = d.Batch?.BatchNumber, // می‌تواند نال باشد
                
                Description = d.Description
            }).ToList()
        };

        return dto;
    }
}