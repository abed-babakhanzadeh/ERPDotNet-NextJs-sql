using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.ApproveInventoryDoc;

[CacheInvalidation("InventoryDocs")]
public record ApproveInventoryDocCommand : IRequest<bool>
{
    public long Id { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
}

public class ApproveInventoryDocValidator : AbstractValidator<ApproveInventoryDocCommand>
{
    public ApproveInventoryDocValidator()
    {
        RuleFor(v => v.Id).GreaterThan(0);
    }
}

public class ApproveInventoryDocHandler : IRequestHandler<ApproveInventoryDocCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public ApproveInventoryDocHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(ApproveInventoryDocCommand request, CancellationToken cancellationToken)
    {
        var doc = await _context.InventoryDocHeaders
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (doc == null) throw new KeyNotFoundException("سند یافت نشد.");

        // 1. فقط اسناد درفت (یا ارسال شده) قابل تایید هستند
        if (doc.Status != InventoryDocStatus.Draft && doc.Status != InventoryDocStatus.Submitted)
            throw new InvalidOperationException($"تغییر وضعیت از {doc.Status} به Approved مجاز نیست.");

        // 2. کنترل همروندی
        _context.Entry(doc).Property(x => x.RowVersion).OriginalValue = request.RowVersion;

        // 3. تغییر وضعیت
        doc.Status = InventoryDocStatus.Approved;
        
        // (اینجا می‌توانید نام تایید کننده و تاریخ تایید را هم ذخیره کنید اگر فیلدش را داشته باشید)

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}