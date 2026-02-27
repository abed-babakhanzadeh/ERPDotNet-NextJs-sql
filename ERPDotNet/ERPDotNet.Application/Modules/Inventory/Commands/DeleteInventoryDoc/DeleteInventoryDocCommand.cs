using System.ComponentModel.DataAnnotations;
using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.DeleteInventoryDoc;

[CacheInvalidation("InventoryDocs")] 
public record DeleteInventoryDocCommand(long Id, string RowVersion) : IRequest<bool>;

public class DeleteInventoryDocHandler : IRequestHandler<DeleteInventoryDocCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteInventoryDocHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteInventoryDocCommand request, CancellationToken cancellationToken)
    {
        var doc = await _context.InventoryDocHeaders
            .Include(x => x.Details)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (doc == null)
            throw new KeyNotFoundException($"سند انبار با شناسه {request.Id} یافت نشد.");

        // 🌟 گاردریل امنیتی جدید (استاندارد ERP)
        if (doc.Status == InventoryDocStatus.InProcess)
            throw new BusinessRuleException("این سند در کارتابل بررسی قرار دارد و قفل شده است. امکان حذف آن وجود ندارد.");

        if (doc.Status == InventoryDocStatus.Posted || doc.Status == InventoryDocStatus.Approved)
            throw new BusinessRuleException("اسناد تایید یا قطعی شده به هیچ وجه قابل حذف نیستند.");

        if (doc.Status != InventoryDocStatus.Draft && doc.Status != InventoryDocStatus.RequiresRevision)
            throw new BusinessRuleException("فقط اسناد 'پیش‌نویس' یا 'نیازمند اصلاح' قابل حذف می‌باشند.");

        // کنترل همروندی
        try 
        {
             var rowVersionBytes = Convert.FromBase64String(request.RowVersion);
            _context.Entry(doc).Property(x => x.RowVersion).OriginalValue = rowVersionBytes;
        }
        catch 
        { 
            throw new ValidationException("RowVersion نامعتبر است."); 
        }

        // پاکسازی لاشه احتمالی در کارتابل (در صورتی که سند نیازمند اصلاح باشد، ممکن است سابقه در BPMS داشته باشد)
        var workflowInstances = await _context.BpmsInstances
            .Include(i => i.Tasks)
            .Include(i => i.Histories)
            .Where(i => i.TargetRecordId == doc.Id)
            .ToListAsync(cancellationToken);

        foreach (var instance in workflowInstances)
        {
            _context.BpmsTasks.RemoveRange(instance.Tasks);
            _context.BpmsHistories.RemoveRange(instance.Histories);
        }
        if (workflowInstances.Any())
        {
            _context.BpmsInstances.RemoveRange(workflowInstances);
        }

        // حذف منطقی
        doc.IsDeleted = true;
        foreach (var item in doc.Details)
        {
            item.IsDeleted = true;
        }
        
        _context.InventoryDocHeaders.Update(doc);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}