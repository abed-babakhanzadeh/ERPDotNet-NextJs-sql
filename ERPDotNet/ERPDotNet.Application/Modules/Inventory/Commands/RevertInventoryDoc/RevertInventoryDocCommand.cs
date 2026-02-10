using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.RevertInventoryDoc;

[CacheInvalidation("InventoryDocs")]
public record RevertInventoryDocCommand(long Id) : IRequest<bool>;

public class RevertInventoryDocHandler : IRequestHandler<RevertInventoryDocCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public RevertInventoryDocHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(RevertInventoryDocCommand request, CancellationToken cancellationToken)
    {
        var doc = await _context.InventoryDocHeaders
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (doc == null)
            throw new KeyNotFoundException($"سند با شناسه {request.Id} یافت نشد.");

        // گاردریل ۱: سند قطعی شده هرگز برنمی‌گردد
        if (doc.Status == InventoryDocStatus.Posted)
        {
            throw new BusinessRuleException("سند قطعی (Posted) شده قابل برگشت نیست. باید سند اصلاحی صادر کنید.");
        }

        // گاردریل ۲: فقط سند تایید شده (یا ارسال شده) می‌تواند برگردد
        if (doc.Status == InventoryDocStatus.Draft)
        {
            // اگر خودش پیش‌نویس است، کاری نکن (Idempotency)
            return true;
        }

        // تغییر وضعیت به پیش‌نویس
        doc.Status = InventoryDocStatus.Draft;
        
        // لاگ تغییرات (توسط اینترسپتور پر می‌شود ولی اینجا تاکید می‌کنیم)
        // doc.LastModifiedAt = DateTime.UtcNow; 

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}