using System.ComponentModel.DataAnnotations;
using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.DeleteInventoryDoc;

[CacheInvalidation("InventoryDocs")] // لیست اسناد باید رفرش شود
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
        // 1. یافتن سند همراه با اقلام (برای حذف آبشاری)
        var doc = await _context.InventoryDocHeaders
            .Include(x => x.Details)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (doc == null)
            throw new KeyNotFoundException($"سند انبار با شناسه {request.Id} یافت نشد.");

        // 2. گاردریل مهم: جلوگیری از حذف سند قطعی شده
        if (doc.Status == InventoryDocStatus.Posted)
        {
            throw new BusinessRuleException("امکان حذف سندی که 'قطعی' (Posted) شده است وجود ندارد. برای اصلاح، باید سند اصلاحی/معکوس ثبت کنید.");
        }

        // ✅ کنترل همروندی برای حذف
        try 
        {
             var rowVersionBytes = Convert.FromBase64String(request.RowVersion);
            _context.Entry(doc).Property(x => x.RowVersion).OriginalValue = rowVersionBytes;
        }
        catch 
        { 
            throw new ValidationException("RowVersion نامعتبر است."); 
        }

        // 3. حذف منطقی (Soft Delete)
        // چون از BaseEntity ارث‌بری کرده‌اید، فقط کافیست IsDeleted را True کنید
        // اینترسپتور خودش بقیه کارها (تاریخ و کاربر حذف کننده) را انجام می‌دهد
        doc.IsDeleted = true;

        // حذف اقلام زیرمجموعه
        foreach (var detail in doc.Details)
        {
            detail.IsDeleted = true;
        }

        // 4. ذخیره تغییرات
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}