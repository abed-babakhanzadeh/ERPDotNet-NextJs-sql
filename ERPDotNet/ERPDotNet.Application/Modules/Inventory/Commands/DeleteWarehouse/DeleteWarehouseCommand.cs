using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.DeleteWarehouse;

[CacheInvalidation("Warehouses", "WarehousesLookup")]
public record DeleteWarehouseCommand(int Id, string RowVersion) : IRequest;

public class DeleteWarehouseHandler : IRequestHandler<DeleteWarehouseCommand>
{
    private readonly IApplicationDbContext _context;

    public DeleteWarehouseHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(DeleteWarehouseCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Warehouses
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (entity == null)
            throw new Exception("انبار مورد نظر یافت نشد.");

        // اعمال کنترل همروندی با RowVersion
        var rowVersionBytes = Convert.FromBase64String(request.RowVersion);
        _context.Entry(entity).Property(x => x.RowVersion).OriginalValue = rowVersionBytes;

        // حذف منطقی (Soft Delete) طبق فیلد IsDeleted در BaseEntity
        entity.IsDeleted = true; // 
        
        await _context.SaveChangesAsync(cancellationToken);
    }
}