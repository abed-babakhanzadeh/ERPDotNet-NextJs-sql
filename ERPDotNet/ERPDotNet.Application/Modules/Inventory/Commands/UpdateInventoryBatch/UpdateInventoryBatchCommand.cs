using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Exceptions; // برای BusinessRuleException
using ERPDotNet.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.UpdateBatch;

[CacheInvalidation("InventoryBatches")]
public record UpdateInventoryBatchCommand : IRequest<bool>
{
    public int Id { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ManufactureDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string? SupplierBatchCode { get; set; }
    public string? Description { get; set; }
    
    // وضعیت مسدود سازی
    public bool IsBlocked { get; set; }
    public string? BlockReason { get; set; }

    public string RowVersion { get; set; } = string.Empty;
}

public class UpdateInventoryBatchHandler : IRequestHandler<UpdateInventoryBatchCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateInventoryBatchHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateInventoryBatchCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.InventoryBatches
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (entity == null) return false;

        // کنترل همروندی
        if (!string.IsNullOrEmpty(request.RowVersion))
        {
            _context.Entry(entity).Property(x => x.RowVersion).OriginalValue = 
                Convert.FromBase64String(request.RowVersion);
        }

        // چک کردن تکراری نبودن شماره بچ (اگر تغییر کرده باشد)
        if (!string.IsNullOrEmpty(request.BatchNumber) && request.BatchNumber != entity.BatchNumber)
        {
             var exists = await _context.InventoryBatches.AnyAsync(x => 
                x.ProductId == entity.ProductId && 
                x.BatchNumber == request.BatchNumber && 
                x.Id != request.Id &&
                !x.IsDeleted, cancellationToken);
             
             if (exists) throw new BusinessRuleException("شماره بچ برای این کالا تکراری است.");
             entity.BatchNumber = request.BatchNumber;
        }

        // به‌روزرسانی فیلدها طبق انتیتی شما
        entity.ManufactureDate = request.ManufactureDate;
        entity.ExpiryDate = request.ExpiryDate;
        entity.SupplierBatchCode = request.SupplierBatchCode;
        entity.Description = request.Description;
        entity.IsBlocked = request.IsBlocked;
        entity.BlockReason = request.BlockReason;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}