using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.ProductEngineering.Commands.DeleteBOM;

[CacheInvalidation("BOMs", "BOMTree")] 
public record DeleteBOMCommand : IRequest<bool>
{
    public int Id { get; set; }
    public byte[]? RowVersion { get; set; }
}

public class DeleteBOMHandler : IRequestHandler<DeleteBOMCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteBOMHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteBOMCommand request, CancellationToken cancellationToken)
    {
        var bom = await _context.BOMHeaders
            .Include(b => b.Details)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (bom == null)
        {
            // بهتر است اینجا اکسپشن ندهیم و false برگردانیم یا هندل کنیم، 
            // اما طبق کدهای قبلی شما، پرتاب خطا هم منطقی است.
            throw new KeyNotFoundException($"فرمول با شناسه {request.Id} یافت نشد.");
        }

        // === کنترل همروندی ===
        if (request.RowVersion != null && request.RowVersion.Length > 0)
        {
            _context.Entry(bom).Property(x => x.RowVersion).OriginalValue = request.RowVersion;
        }

        // === کنترل یکپارچگی (Where Used Check) ===
        if (bom.IsActive)
        {
            var isUsedInOtherBOMs = await _context.BOMDetails
                .AnyAsync(d => 
                    d.ChildProductId == bom.ProductId && 
                    d.BOMHeader != null && // <--- اصلاحیه: چک کردن نال نبودن هدر
                    !d.BOMHeader.IsDeleted && 
                    d.BOMHeader.IsActive, 
                    cancellationToken);

            if (isUsedInOtherBOMs)
            {
                throw new Exception("این فرمول مربوط به محصولی است که در ساختار تولید سایر محصولات استفاده شده است. امکان حذف فرمول فعال وجود ندارد.");
            }
        }

        // Soft Delete Header
        bom.IsDeleted = true;
        bom.IsActive = false;
        bom.Status = Domain.Modules.ProductEngineering.Entities.BOMStatus.Obsolete;
        
        // Soft Delete Details
        foreach (var detail in bom.Details)
        {
            detail.IsDeleted = true;
        }

        try 
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new Exception("این رکورد همزمان توسط کاربر دیگری تغییر کرده است.");
        }

        return true;
    }
}