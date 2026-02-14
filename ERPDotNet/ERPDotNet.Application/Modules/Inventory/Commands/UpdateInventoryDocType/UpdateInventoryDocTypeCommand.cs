using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.UpdateInventoryDocType;

[CacheInvalidation("InventoryDocTypes")]
public record UpdateInventoryDocTypeCommand : IRequest<bool>
{
    public int Id { get; set; }
    public required string Title { get; set; }
    // Nature معمولاً قابل تغییر نیست چون منطق سیستم را بهم می‌ریزد، اما اگر سند ثبت نشده باشد شاید بشود.
    // فعلاً فرض می‌کنیم قابل ویرایش نیست یا کنترل می‌شود.
    
    public int? ParentId { get; set; }
    public string? RequiredPermissionName { get; set; }
    public bool AffectsCost { get; set; }
    public NumberingScope NumberingScope { get; set; }
    public bool IsReferenceRequired { get; set; }
    
    // لیست جدید رفرنس‌ها (جایگزین لیست قبلی می‌شود)
    public List<string> AllowedReferenceEntityNames { get; set; } = new();
    
    public string RowVersion { get; set; } = string.Empty;
}

public class UpdateInventoryDocTypeHandler : IRequestHandler<UpdateInventoryDocTypeCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateInventoryDocTypeHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateInventoryDocTypeCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.InventoryDocTypes
            .Include(x => x.AllowedReferences)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (entity == null) return false;

        // کنترل همروندی
        if (!string.IsNullOrEmpty(request.RowVersion))
        {
            _context.Entry(entity).Property(x => x.RowVersion).OriginalValue = 
                Convert.FromBase64String(request.RowVersion);
        }

        // چک کردن تکراری نبودن عنوان
        var isDuplicate = await _context.InventoryDocTypes
            .AnyAsync(x => x.Title == request.Title && x.Id != request.Id && !x.IsDeleted, cancellationToken);
        
        if (isDuplicate)
            throw new BusinessRuleException("عنوان نوع سند تکراری است.");

        // به‌روزرسانی فیلدها
        entity.Title = request.Title;
        entity.ParentId = request.ParentId;
        entity.RequiredPermissionName = request.RequiredPermissionName;
        entity.AffectsCost = request.AffectsCost;
        entity.NumberingScope = request.NumberingScope;
        entity.IsReferenceRequired = request.IsReferenceRequired;

        // === مدیریت رفرنس‌های مجاز (Child Collection Update) ===
        // استراتژی: حذف همه و ایجاد دوباره (ساده‌ترین روش برای جداول واسط ساده)
        // روش بهینه‌تر: مقایسه و فقط حذف/اضافه کردن تغییرات است.
        
        // 1. حذف رفرنس‌های فعلی
        entity.AllowedReferences.Clear();

        // 2. افزودن رفرنس‌های جدید
        if (request.AllowedReferenceEntityNames.Any())
        {
            foreach (var refName in request.AllowedReferenceEntityNames.Distinct())
            {
                entity.AllowedReferences.Add(new InventoryDocTypeAllowedRef
                {
                    ReferenceEntityName = refName
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}