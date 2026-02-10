using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.UpdateInventoryDoc;

[CacheInvalidation("InventoryDocs")]
public class UpdateInventoryDocCommand : IRequest<bool>
{
    public long Id { get; set; }
    public DateTime DocDate { get; set; }
    public string? Description { get; set; }
    public int WarehouseId { get; set; }
    
    // ✅ اضافه شد: برای کنترل همروندی
    public string RowVersion { get; set; } = string.Empty; 

    public List<UpdateInventoryDocDetailDto> Details { get; set; } = new();
}

public class UpdateInventoryDocDetailDto
{
    // اگر نال یا صفر باشد = سطر جدید (Insert)
    // اگر مقدار داشته باشد = سطر موجود (Update)
    public long? Id { get; set; } 
    
    public int ProductId { get; set; }
    public decimal MainUnitQuantity { get; set; }
    public decimal SubUnitQuantity { get; set; }
    public int LocationId { get; set; }
    public int? BatchId { get; set; }
    public string? Description { get; set; }
}

public class UpdateInventoryDocValidator : AbstractValidator<UpdateInventoryDocCommand>
{
    public UpdateInventoryDocValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.DocDate).NotEmpty();
        RuleFor(x => x.WarehouseId).GreaterThan(0);
        RuleForEach(x => x.Details).ChildRules(d =>
        {
            d.RuleFor(x => x.ProductId).GreaterThan(0);
            d.RuleFor(x => x.MainUnitQuantity).GreaterThan(0);
        });
    }
}

public class UpdateInventoryDocHandler : IRequestHandler<UpdateInventoryDocCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateInventoryDocHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateInventoryDocCommand request, CancellationToken cancellationToken)
    {
        // 1. لود کردن سند همراه با اقلام (شامل اقلام حذف شده نباشد)
        var doc = await _context.InventoryDocHeaders
            .Include(x => x.Details.Where(d => !d.IsDeleted)) 
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (doc == null)
            throw new KeyNotFoundException($"سند با شناسه {request.Id} یافت نشد.");

        // 2. گاردریل وضعیت: فقط Draft ویرایش می‌شود
        if (doc.Status != InventoryDocStatus.Draft)
        {
            throw new BusinessRuleException("فقط اسناد در وضعیت 'پیش‌نویس' قابل ویرایش هستند. اگر سند تایید شده است، ابتدا آن را 'برگشت' (Revert) بزنید.");
        }

        // 3. گاردریل تغییر انبار (Tier-0 Rule)
        // تغییر انبار فقط وقتی مجاز است که هیچ سطری در دیتابیس نباشد (یا کاربر همه را حذف کرده باشد)
        // اما برای امنیت بیشتر، اگر انبار عوض شده و سند سطر دارد، خطا می‌دهیم.
        if (doc.WarehouseId != request.WarehouseId)
        {
            if (doc.Details.Any())
            {
                throw new BusinessRuleException("امکان تغییر انبار برای سندی که دارای اقلام است وجود ندارد. ابتدا اقلام را حذف کنید یا سند جدید بسازید.");
            }
            // اگر سطری نداشت، تغییر انبار مجاز است
            doc.WarehouseId = request.WarehouseId;
        }

        // ✅ کنترل همروندی (مهمترین بخش)
        // این خط به EF می‌گوید: "وقتی خواستی آپدیت کنی، چک کن که RowVersion در دیتابیس دقیقاً همین باشد"
        // اگر تغییر کرده باشد، EF خطا می‌دهد و جلوی بازنویسی را می‌گیرد.
        try 
        {
            var rowVersionBytes = Convert.FromBase64String(request.RowVersion);
            _context.Entry(doc).Property(x => x.RowVersion).OriginalValue = rowVersionBytes;
        }
        catch 
        { 
            throw new ValidationException("RowVersion نامعتبر است."); 
        }

        // 4. آپدیت هدر
        doc.DocDate = request.DocDate;
        doc.Description = request.Description;
        // نکته: Audit Fields (ModifiedBy, ModifiedAt) توسط اینترسپتور خودکار پر می‌شوند

        // ==================================================
        // 5. الگوریتم آپدیت هوشمند اقلام (Smart Update)
        // ==================================================
        
        var requestDetailIds = request.Details
            .Where(x => x.Id.HasValue && x.Id > 0)
            .Select(x => x.Id!.Value)
            .ToList();

        // الف) شناسایی حذفی‌ها (Delete)
        // آنهایی که در دیتابیس هستند ولی در لیست درخواستی کلاینت نیستند
        var itemsToDelete = doc.Details
            .Where(dbItem => !requestDetailIds.Contains(dbItem.Id))
            .ToList();

        foreach (var item in itemsToDelete)
        {
            // Soft Delete استاندارد
            item.IsDeleted = true; 
        }

        // ب) پردازش ورودی‌ها (Insert / Update)
        foreach (var reqDetail in request.Details)
        {
            if (reqDetail.Id.HasValue && reqDetail.Id > 0)
            {
                // --- UPDATE ---
                var existingItem = doc.Details.FirstOrDefault(x => x.Id == reqDetail.Id);
                if (existingItem != null)
                {
                    existingItem.ProductId = reqDetail.ProductId;
                    existingItem.MainUnitQuantity = reqDetail.MainUnitQuantity;
                    existingItem.SubUnitQuantity = reqDetail.SubUnitQuantity;
                    existingItem.LocationId = reqDetail.LocationId;
                    existingItem.BatchId = reqDetail.BatchId;
                    existingItem.Description = reqDetail.Description;
                    // اینجا ModifiedAt خودکار آپدیت می‌شود
                }
            }
            else
            {
                // --- INSERT ---
                var newItem = new InventoryDocDetail
                {
                    HeaderId = doc.Id, // اتصال به هدر
                    ProductId = reqDetail.ProductId,
                    MainUnitQuantity = reqDetail.MainUnitQuantity,
                    SubUnitQuantity = reqDetail.SubUnitQuantity,
                    LocationId = reqDetail.LocationId,
                    BatchId = reqDetail.BatchId,
                    Description = reqDetail.Description
                    // CreatedAt, CreatedBy خودکار پر می‌شوند
                };
                doc.Details.Add(newItem);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}