using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.ProductEngineering.Commands.UpdateBOM;

[CacheInvalidation("BOMs")] 
public record UpdateBOMCommand : IRequest<bool>
{
    public int Id { get; set; }
    public required string Title { get; set; }
    
    // تغییر ۱: ورژن عددی شد
    public int Version { get; set; }
    
    // تغییر ۲: اضافه شدن قابلیت تغییر وضعیت (اصلی/فرعی)
    public BOMUsage Usage { get; set; }

    public BOMType Type { get; set; }
    public BOMStatus Status { get; set; }
    public bool IsActive { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime? ToDate { get; set; }

    public byte[]? RowVersion { get; set; }

    public List<BOMDetailUpdateDto> Details { get; set; } = new();
}

public record BOMDetailUpdateDto
{
    public int? Id { get; set; } 
    public int ChildProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal InputQuantity { get; set; }
    public int InputUnitId { get; set; }
    public decimal WastePercentage { get; set; }
    public List<BOMSubstituteUpdateDto> Substitutes { get; set; } = new();
}

public record BOMSubstituteUpdateDto
{
    public int? Id { get; set; }
    public int SubstituteProductId { get; set; }
    public int Priority { get; set; }
    public decimal Factor { get; set; }
    public bool IsMixAllowed { get; set; }
    public decimal MaxMixPercentage { get; set; }
    public string? Note { get; set; }
}

public class UpdateBOMValidator : AbstractValidator<UpdateBOMCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateBOMValidator(IApplicationDbContext context)
    {
        _context = context;

        // 1. ولیدیشن‌های سطح هدر (Header)
        RuleFor(x => x.Id).GreaterThan(0);
        
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("عنوان فرمول نمی‌تواند خالی باشد.")
            .MaximumLength(100).WithMessage("عنوان فرمول نمی‌تواند بیشتر از 100 کاراکتر باشد.");

        RuleFor(x => x.Version)
            .GreaterThan(0).WithMessage("شماره نسخه باید بزرگتر از صفر باشد.");

        // تاریخ پایان نباید قبل از تاریخ شروع باشد (اگر تاریخ پایان پر شده باشد)
        RuleFor(x => x)
            .Must(x => !x.ToDate.HasValue || x.ToDate >= x.FromDate)
            .WithMessage("تاریخ پایان اعتبار نمی‌تواند قبل از تاریخ شروع باشد.");

        // --- قانون تجاری مهم: یکتایی فرمول اصلی ---
        // اگر کاربر دارد فرمول را "Main" و "Active" می‌کند، باید چک کنیم فرمول اصلی دیگری وجود نداشته باشد.
        RuleFor(x => x)
            .MustAsync(NotHaveDuplicateActiveMain)
            .WithMessage("برای این محصول قبلاً یک فرمول 'اصلی' فعال ثبت شده است. لطفاً ابتدا فرمول قبلی را غیرفعال کنید یا این فرمول را به عنوان 'فرعی' ثبت نمایید.");

        // 2. ولیدیشن‌های لیست مواد اولیه (Details)
        RuleForEach(x => x.Details).SetValidator(new BOMDetailUpdateValidator());

        // جلوگیری از تکرار یک کالا در لیست مواد اولیه
        RuleFor(x => x.Details)
            .Must(details => details.Select(d => d.ChildProductId).Distinct().Count() == details.Count)
            .WithMessage("یک کالا نمی‌تواند چند بار در لیست مواد اولیه تکرار شود (موارد تکراری را ادغام کنید).");
            
        // جلوگیری از لوپ: پدر نمی‌تواند فرزند خودش باشد
        // (این نیاز به کوئری دارد تا ProductId پدر را پیدا کنیم)
        RuleFor(x => x)
            .MustAsync(NotBeCircularDependency)
            .WithMessage("خطای مهندسی: محصول نهایی نمی‌تواند به عنوان زیرمجموعه خودش استفاده شود (لوپ تولید).");
    }

    // لاجیک چک کردن فرمول اصلی تکراری
    private async Task<bool> NotHaveDuplicateActiveMain(UpdateBOMCommand command, CancellationToken token)
    {
        // اگر این فرمول قرار نیست "اصلی" باشد یا "فعال" باشد، مشکلی نیست
        if (command.Usage != BOMUsage.Main || !command.IsActive) return true;

        // 1. پیدا کردن ProductId فرمول جاری (چون در کامند آپدیت ProductId نداریم)
        var currentBom = await _context.BOMHeaders
            .AsNoTracking()
            .Select(b => new { b.Id, b.ProductId })
            .FirstOrDefaultAsync(b => b.Id == command.Id, token);

        if (currentBom == null) return true; // اگر BOM پیدا نشد، ولیدیتور 404 نمی‌دهد (هندلر می‌دهد)

        // 2. آیا فرمول اصلیِ فعالِ دیگری برای این محصول وجود دارد؟
        // (خودش را از جستجو استثنا می‌کنیم: x.Id != command.Id)
        var hasOtherActiveMain = await _context.BOMHeaders
            .AnyAsync(b => b.ProductId == currentBom.ProductId 
                           && b.Id != command.Id // <--- مهم: خودش نباشد
                           && b.Usage == BOMUsage.Main 
                           && b.IsActive == true 
                           && b.IsDeleted == false, token);

        return !hasOtherActiveMain;
    }

    // لاجیک جلوگیری از لوپ (پدر در فرزندان نباشد)
    private async Task<bool> NotBeCircularDependency(UpdateBOMCommand command, CancellationToken token)
    {
        var currentBom = await _context.BOMHeaders
            .AsNoTracking()
            .Select(b => new { b.Id, b.ProductId })
            .FirstOrDefaultAsync(b => b.Id == command.Id, token);

        if (currentBom == null) return true;

        // چک می‌کنیم آیا ProductId پدر، در لیست ChildProductIdهای ارسالی وجود دارد؟
        bool isParentInChildren = command.Details.Any(d => d.ChildProductId == currentBom.ProductId);
        
        return !isParentInChildren;
    }
}

// ولیدیتور داخلی برای اقلام (Detail)
public class BOMDetailUpdateValidator : AbstractValidator<BOMDetailUpdateDto>
{
    public BOMDetailUpdateValidator()
    {
        RuleFor(x => x.ChildProductId).GreaterThan(0)
            .WithMessage("انتخاب کالای مواد اولیه الزامی است.");

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("مقدار مصرف باید بزرگتر از صفر باشد.");

        RuleFor(x => x.WastePercentage)
            .InclusiveBetween(0, 100).WithMessage("درصد ضایعات باید بین 0 تا 100 باشد.");

        RuleFor(x => x.InputQuantity)
            .GreaterThanOrEqualTo(0).WithMessage("مقدار ورودی نمی‌تواند منفی باشد.");

        // ولیدیشن جایگزین‌ها
        RuleForEach(x => x.Substitutes).SetValidator(new BOMSubstituteUpdateValidator());
    }
}

// ولیدیتور داخلی برای جایگزین‌ها (Substitute)
public class BOMSubstituteUpdateValidator : AbstractValidator<BOMSubstituteUpdateDto>
{
    public BOMSubstituteUpdateValidator()
    {
        RuleFor(x => x.SubstituteProductId).GreaterThan(0)
            .WithMessage("کالای جایگزین نامعتبر است.");

        RuleFor(x => x.Factor)
            .GreaterThan(0).WithMessage("ضریب تبدیل جایگزین باید بزرگتر از صفر باشد.");
            
        RuleFor(x => x.MaxMixPercentage)
            .InclusiveBetween(0, 100).WithMessage("درصد مجاز میکس باید بین 0 تا 100 باشد.");
    }
}

public class UpdateBOMHandler : IRequestHandler<UpdateBOMCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateBOMHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateBOMCommand request, CancellationToken cancellationToken)
    {
        // لود کردن کامل هدر و دیتیل‌ها برای ویرایش
        var entity = await _context.BOMHeaders
            .Include(x => x.Details)
            .ThenInclude(d => d.Substitutes)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (entity == null) throw new KeyNotFoundException($"BOM with id {request.Id} not found.");

        // کنترل همروندی (Optimistic Concurrency)
        if (request.RowVersion != null && !entity.RowVersion.SequenceEqual(request.RowVersion))
        {
            throw new DbUpdateConcurrencyException("The record has been modified by another user.");
        }

        // --- آپدیت فیلدهای هدر ---
        entity.Title = request.Title;
        entity.Version = request.Version;
        entity.Usage = request.Usage; // اضافه شد
        entity.Type = request.Type;
        entity.Status = request.Status;
        entity.IsActive = request.IsActive;
        entity.FromDate = request.FromDate;
        entity.ToDate = request.ToDate;

        // --- آپدیت دیتیل‌ها (منطق قبلی شما حفظ شد) ---
        // 1. حذف شده‌ها
        var requestDetailIds = request.Details.Where(x => x.Id.HasValue).Select(x => x.Id!.Value).ToList();
        var detailsToDelete = entity.Details.Where(x => !requestDetailIds.Contains(x.Id)).ToList();
        foreach (var d in detailsToDelete) _context.BOMDetails.Remove(d);

        // 2. افزوده یا ویرایش شده‌ها
        foreach (var detailDto in request.Details)
        {
            if (detailDto.Id.HasValue && detailDto.Id > 0)
            {
                // ویرایش
                var existingDetail = entity.Details.FirstOrDefault(x => x.Id == detailDto.Id.Value);
                if (existingDetail != null)
                {
                    existingDetail.ChildProductId = detailDto.ChildProductId;
                    existingDetail.Quantity = detailDto.Quantity;
                    existingDetail.InputQuantity = detailDto.InputQuantity;
                    existingDetail.InputUnitId = detailDto.InputUnitId;
                    existingDetail.WastePercentage = detailDto.WastePercentage;

                    UpdateSubstitutes(existingDetail, detailDto.Substitutes);
                }
            }
            else
            {
                // جدید
                var newDetail = new BOMDetail
                {
                    BOMHeaderId = entity.Id,
                    ChildProductId = detailDto.ChildProductId,
                    Quantity = detailDto.Quantity,
                    InputQuantity = detailDto.InputQuantity,
                    InputUnitId = detailDto.InputUnitId,
                    WastePercentage = detailDto.WastePercentage
                };
                
                // افزودن جایگزین‌های جدید
                foreach (var subDto in detailDto.Substitutes)
                {
                    newDetail.Substitutes.Add(new BOMSubstitute
                    {
                        BOMDetailId = 0,
                        SubstituteProductId = subDto.SubstituteProductId,
                        Priority = subDto.Priority,
                        Factor = subDto.Factor,
                        IsMixAllowed = subDto.IsMixAllowed,
                        MaxMixPercentage = subDto.MaxMixPercentage,
                        Note = subDto.Note
                    });
                }
                
                entity.Details.Add(newDetail);
            }
        }

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex)
        {
            // هندل کردن خطای Unique Constraint (اگر کاربر سعی کرد دوتا Main فعال داشته باشد)
            if (ex.InnerException != null && ex.InnerException.Message.Contains("IX_")) 
            {
                throw new Exception("امکان ثبت دو فرمول 'اصلی' فعال برای یک محصول وجود ندارد.");
            }
            throw;
        }

        return true;
    }

    private void UpdateSubstitutes(BOMDetail currentDetail, List<BOMSubstituteUpdateDto> substituteDtos)
    {
        var reqSubIds = substituteDtos.Where(x => x.Id.HasValue).Select(x => x.Id!.Value).ToList();
        
        // حذف
        var toDelete = currentDetail.Substitutes.Where(x => !reqSubIds.Contains(x.Id)).ToList();
        foreach (var sub in toDelete) 
            currentDetail.Substitutes.Remove(sub); // چون رابطه Cascade نیست شاید لازم باشد دستی Remove کنید یا کانتکست هندل کند

        // افزودن/ویرایش
        foreach (var subDto in substituteDtos)
        {
            if (subDto.Id.HasValue && subDto.Id > 0)
            {
                var existing = currentDetail.Substitutes.FirstOrDefault(x => x.Id == subDto.Id);
                if (existing != null)
                {
                    existing.SubstituteProductId = subDto.SubstituteProductId;
                    existing.Priority = subDto.Priority;
                    existing.Factor = subDto.Factor;
                    existing.IsMixAllowed = subDto.IsMixAllowed;
                    existing.MaxMixPercentage = subDto.MaxMixPercentage;
                    existing.Note = subDto.Note;
                }
            }
            else
            {
                currentDetail.Substitutes.Add(new BOMSubstitute
                {
                    BOMDetailId = currentDetail.Id,
                    SubstituteProductId = subDto.SubstituteProductId,
                    Priority = subDto.Priority,
                    Factor = subDto.Factor,
                    IsMixAllowed = subDto.IsMixAllowed,
                    MaxMixPercentage = subDto.MaxMixPercentage,
                    Note = subDto.Note
                });
            }
        }
    }
}