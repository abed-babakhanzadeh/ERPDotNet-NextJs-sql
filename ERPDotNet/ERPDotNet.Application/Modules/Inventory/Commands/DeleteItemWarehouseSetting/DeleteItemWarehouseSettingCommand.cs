using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.SetItemWarehouseSetting;

[CacheInvalidation("ItemWarehouseSettings", "InventoryProfiles")]
public record DeleteItemWarehouseSettingCommand(int Id, string RowVersion) : IRequest<int>;

public class DeleteItemWarehouseSettingHandler : IRequestHandler<DeleteItemWarehouseSettingCommand, int>
{
    private readonly IApplicationDbContext _context;

    public DeleteItemWarehouseSettingHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(DeleteItemWarehouseSettingCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.ItemWarehouseSettings
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        // رفع خطای NotFoundException
        if (entity == null)
            throw new Exception("تنظیمات انبار مورد نظر یافت نشد.");

        // کنترل همروندی
        if (!string.IsNullOrEmpty(request.RowVersion))
        {
            var rowVersionBytes = Convert.FromBase64String(request.RowVersion);
            _context.Entry(entity).Property(x => x.RowVersion).OriginalValue = rowVersionBytes;
        }

        // حذف منطقی (Soft Delete)
        entity.IsDeleted = true;

        await _context.SaveChangesAsync(cancellationToken);
        return request.Id;
    }
}