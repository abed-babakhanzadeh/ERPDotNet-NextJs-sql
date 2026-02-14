using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.DeleteInventoryDocType;

[CacheInvalidation("InventoryDocTypes")]
public record DeleteInventoryDocTypeCommand(int Id, string RowVersion) : IRequest<int>;

public class DeleteInventoryDocTypeHandler : IRequestHandler<DeleteInventoryDocTypeCommand, int>
{
    private readonly IApplicationDbContext _context;

    public DeleteInventoryDocTypeHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(DeleteInventoryDocTypeCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.InventoryDocTypes
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (entity == null)
            throw new Exception("نوع سند یافت نشد.");

        // کنترل همروندی
        if (!string.IsNullOrEmpty(request.RowVersion))
        {
            var rowVersionBytes = Convert.FromBase64String(request.RowVersion);
            _context.Entry(entity).Property(x => x.RowVersion).OriginalValue = rowVersionBytes;
        }

        // === کنترل وابستگی‌ها ===
        
        // 1. آیا سندی با این نوع ثبت شده است؟
        var hasDocs = await _context.InventoryDocHeaders
            .AnyAsync(x => x.DocTypeId == request.Id, cancellationToken);
            
        if (hasDocs)
            throw new BusinessRuleException("برای این نوع سند، برگه انبار صادر شده است و قابل حذف نیست.");

        // 2. آیا فرزند دارد؟ (اگر ساختار درختی استفاده شود)
        var hasChildren = await _context.InventoryDocTypes
            .AnyAsync(x => x.ParentId == request.Id && !x.IsDeleted, cancellationToken);
            
        if (hasChildren)
            throw new BusinessRuleException("این نوع سند دارای زیرمجموعه است.");

        // حذف منطقی
        entity.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);

        return request.Id;
    }
}