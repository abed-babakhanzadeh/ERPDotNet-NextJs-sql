using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Exceptions; // اضافه شد برای BusinessRuleException
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.UpdateWarehouse;

[CacheInvalidation("Warehouses", "WarehousesLookup")]
public record UpdateWarehouseCommand : IRequest<bool>
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public required string Code { get; set; }
    public WarehouseType Type { get; set; }
    public string? Address { get; set; }
    public bool IsActive { get; set; }
    public string RowVersion { get; set; } = string.Empty;
}

public class UpdateWarehouseHandler : IRequestHandler<UpdateWarehouseCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateWarehouseHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateWarehouseCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Warehouses
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (entity == null) return false;

        // چک کردن تکراری نبودن کد (بجز خودش)
        if (await _context.Warehouses.AnyAsync(x => x.Code == request.Code && x.Id != request.Id, cancellationToken))
            throw new BusinessRuleException("کد انبار تکراری است."); 

        entity.Title = request.Title;
        entity.Code = request.Code;
        entity.Type = request.Type;
        entity.Address = request.Address;
        entity.IsActive = request.IsActive;
        
        if (!string.IsNullOrEmpty(request.RowVersion))
        {
            _context.Entry(entity).Property(x => x.RowVersion).OriginalValue = Convert.FromBase64String(request.RowVersion);
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}