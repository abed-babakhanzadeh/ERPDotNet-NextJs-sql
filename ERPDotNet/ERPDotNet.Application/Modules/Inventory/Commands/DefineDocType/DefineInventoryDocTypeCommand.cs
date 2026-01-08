using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.DefineDocType;

[CacheInvalidation("InventoryDocTypes")] // لیست انواع سند برای دراپ‌داون‌ها کش می‌شود
public record DefineInventoryDocTypeCommand : IRequest<int>
{
    public required string Title { get; set; }
    public InventoryNature Nature { get; set; } // ماهیت: ورود/خروج
    
    // === فیلدهای پیشرفته (طبق انتیتی شما) ===
    public int? ParentId { get; set; } // ساختار درختی
    public string? RequiredPermissionName { get; set; } // امنیت در سطح رفتار
    public bool AffectsCost { get; set; } = true; // آیا ریالی است؟
    
    // تنظیمات شماره‌گذاری
    public NumberingScope NumberingScope { get; set; } = NumberingScope.Global;

    // تنظیمات رفرنس (مبنا)
    public bool IsReferenceRequired { get; set; }
    
    // لیست موجودیت‌های مجاز (PurchaseOrder, etc.)
    public List<string> AllowedReferenceEntityNames { get; set; } = new();
}

public class DefineInventoryDocTypeValidator : AbstractValidator<DefineInventoryDocTypeCommand>
{
    private readonly IApplicationDbContext _context;

    public DefineInventoryDocTypeValidator(IApplicationDbContext context)
    {
        _context = context;

        // 1. عنوان
        RuleFor(x => x.Title).NotEmpty().MaximumLength(100)
            .MustAsync(BeUniqueTitle).WithMessage("عنوان نوع سند تکراری است.");
        
        // 2. Enum Safety
        RuleFor(x => x.Nature).IsInEnum();
        RuleFor(x => x.NumberingScope).IsInEnum();

        // 3. پرمیشن
        RuleFor(x => x.RequiredPermissionName).MaximumLength(100);

        // 4. اعتبارسنجی والد (Parent)
        RuleFor(x => x.ParentId)
            .MustAsync(ParentExists).When(x => x.ParentId.HasValue)
            .WithMessage("شناسه نوع سند والد (Parent) نامعتبر است یا وجود ندارد.");

        // 5. اعتبارسنجی لیست رفرنس‌ها (Future Proofing)
        // چک می‌کنیم نام‌های تکراری یا خالی ارسال نشود
        RuleForEach(x => x.AllowedReferenceEntityNames)
            .NotEmpty().WithMessage("نام موجودیت رفرنس نمی‌تواند خالی باشد.")
            .Must(name => !string.IsNullOrWhiteSpace(name));
    }

    private async Task<bool> BeUniqueTitle(string title, CancellationToken token)
    {
        // چک کردن یکتایی عنوان (بدون در نظر گرفتن حذف شده‌ها برای جلوگیری از اشتباه اپراتور)
        return !await _context.InventoryDocTypes
            .IgnoreQueryFilters() 
            .AnyAsync(x => x.Title == title && !x.IsDeleted, token);
    }

    private async Task<bool> ParentExists(int? parentId, CancellationToken token)
    {
        if (!parentId.HasValue) return true;
        // والد باید وجود داشته باشد و حذف نشده باشد
        return await _context.InventoryDocTypes.AnyAsync(x => x.Id == parentId && !x.IsDeleted, token);
    }
}

public class DefineInventoryDocTypeHandler : IRequestHandler<DefineInventoryDocTypeCommand, int>
{
    private readonly IApplicationDbContext _context;

    public DefineInventoryDocTypeHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(DefineInventoryDocTypeCommand request, CancellationToken cancellationToken)
    {
        var docType = new InventoryDocType
        {
            Title = request.Title,
            Nature = request.Nature,
            
            // مپ کردن فیلدهای پیشرفته
            ParentId = request.ParentId,
            RequiredPermissionName = request.RequiredPermissionName,
            AffectsCost = request.AffectsCost,
            
            // تنظیمات سیستمی
            NumberingScope = request.NumberingScope,
            IsReferenceRequired = request.IsReferenceRequired
            
            // IsActive در انتیتی شما نبود (با IsDeleted مدیریت می‌شود)، اگر اضافه کردید اینجا ست کنید
        };

        // افزودن رفرنس‌های مجاز به جدول فرزند
        if (request.AllowedReferenceEntityNames.Any())
        {
            // حذف تکراری‌ها برای اطمینان
            var distinctRefs = request.AllowedReferenceEntityNames.Distinct();
            
            foreach (var refName in distinctRefs)
            {
                docType.AllowedReferences.Add(new InventoryDocTypeAllowedRef
                {
                    ReferenceEntityName = refName
                });
            }
        }

        _context.InventoryDocTypes.Add(docType);
        await _context.SaveChangesAsync(cancellationToken);

        return docType.Id;
    }
}