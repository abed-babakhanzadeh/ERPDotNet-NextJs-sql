using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.ProductEngineering.Commands.UpdateBOM;

[CacheInvalidation("BOMs", "BOMTree")]
public record UpdateBOMCommand : IRequest<bool>
{
    public int Id { get; set; } // ID خود BOM
    public required string Title { get; set; }
    public required string Version { get; set; }
    public int Type { get; set; } // int از فرانت
    public DateTime FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public bool IsActive { get; set; }
    
    public byte[]? RowVersion { get; set; } // کنترل همروندی

    public List<BOMDetailUpdateDto> Details { get; set; } = new();
}

public class BOMDetailUpdateDto
{
    public int? Id { get; set; } // اگر مقدار داشته باشد یعنی ویرایش، اگر 0/null باشد یعنی جدید
    public int ChildProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal InputQuantity { get; set; }
    public int InputUnitId { get; set; }
    public decimal WastePercentage { get; set; }
    public List<BOMSubstituteUpdateDto>? Substitutes { get; set; }
}

public class BOMSubstituteUpdateDto
{
    public int? Id { get; set; }
    public int SubstituteProductId { get; set; }
    public decimal Factor { get; set; }
    public int Priority { get; set; }
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

        RuleFor(v => v.Id).GreaterThan(0);
        RuleFor(v => v.Title).NotEmpty().MaximumLength(100);
        RuleFor(v => v.Version).NotEmpty().MaximumLength(20);

        // 1. ولیدیشن یکتایی ورژن (برای همین محصول، اما رکورد غیر از این ID)
        RuleFor(v => v)
            .MustAsync(async (model, token) =>
            {
                // ابتدا باید ProductId این BOM را پیدا کنیم
                var currentBom = await _context.BOMHeaders
                    .AsNoTracking()
                    .Select(b => new { b.Id, b.ProductId })
                    .FirstOrDefaultAsync(b => b.Id == model.Id, token);

                if (currentBom == null) return true; // اگر پیدا نشد، هندلر خطا میدهد (اینجا رد میکنیم)

                // چک میکنیم آیا ورژن دیگری با همین ProductId وجود دارد؟
                return !await _context.BOMHeaders.AnyAsync(b => 
                    b.ProductId == currentBom.ProductId && 
                    b.Version == model.Version && 
                    b.Id != model.Id, // خودمان را نادیده بگیر
                    token);
            })
            .WithMessage("این شماره نسخه برای این محصول قبلاً ثبت شده است.");

        // 2. جلوگیری از چرخه مستقیم (محصول نهایی در لیست مواد اولیه نباشد)
        RuleFor(v => v)
            .MustAsync(async (model, token) =>
            {
                 var productId = await _context.BOMHeaders
                    .Where(b => b.Id == model.Id)
                    .Select(b => b.ProductId)
                    .FirstOrDefaultAsync(token);
                
                if (productId == 0) return true;

                // هیچکدام از اقلام نباید برابر با محصول نهایی باشند
                return !model.Details.Any(d => d.ChildProductId == productId);
            })
            .WithMessage("خطای چرخه: محصول نهایی نمی‌تواند به عنوان مواد اولیه خودش استفاده شود.");

        // 3. اعتبارسنجی اقلام
        RuleForEach(v => v.Details).ChildRules(d => {
            d.RuleFor(x => x.ChildProductId).GreaterThan(0).WithMessage("کالا انتخاب نشده است.");
            d.RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("مقدار مصرف باید بیشتر از صفر باشد.");
        });

        // 4. جلوگیری از اقلام تکراری در لیست ارسالی
        RuleFor(v => v.Details)
            .Must(details => details.Select(d => d.ChildProductId).Distinct().Count() == details.Count)
            .WithMessage("یک کالا نمی‌تواند چند بار در لیست اقلام تکرار شود.");
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
        var bom = await _context.BOMHeaders
            .Include(b => b.Details)
                .ThenInclude(d => d.Substitutes)
            .FirstOrDefaultAsync(b => b.Id == request.Id, cancellationToken);

        if (bom == null) throw new KeyNotFoundException("BOM یافت نشد.");

        // کنترل همروندی
        if (request.RowVersion != null && request.RowVersion.Length > 0)
        {
            _context.Entry(bom).Property(b => b.RowVersion).OriginalValue = request.RowVersion;
        }

        // آپدیت فیلدهای هدر
        bom.Title = request.Title;
        bom.Version = request.Version;
        bom.Type = (BOMType)request.Type; // تبدیل int به Enum
        bom.FromDate = request.FromDate;
        bom.ToDate = request.ToDate;
        bom.IsActive = request.IsActive;

        // === همگام‌سازی هوشمند اقلام (Smart Sync) ===
        
        // الف) حذف مواردی که در لیست جدید نیستند
        var requestDetailIds = request.Details
            .Where(d => d.Id.HasValue && d.Id.Value > 0)
            .Select(d => d.Id!.Value)
            .ToList();

        var detailsToDelete = bom.Details
            .Where(d => !requestDetailIds.Contains(d.Id))
            .ToList();

        foreach (var d in detailsToDelete)
        {
            _context.BOMDetails.Remove(d);
        }

        // ب) افزودن یا ویرایش موارد
        foreach (var detailDto in request.Details)
        {
            if (detailDto.Id.HasValue && detailDto.Id > 0)
            {
                // --- ویرایش سطر موجود ---
                var existingDetail = bom.Details.FirstOrDefault(d => d.Id == detailDto.Id.Value);
                if (existingDetail != null)
                {
                    existingDetail.ChildProductId = detailDto.ChildProductId;
                    existingDetail.Quantity = detailDto.Quantity;
                    existingDetail.InputQuantity = detailDto.InputQuantity;
                    existingDetail.InputUnitId = detailDto.InputUnitId;
                    existingDetail.WastePercentage = detailDto.WastePercentage;

                    // مدیریت جایگزین‌ها برای این سطر
                    UpdateSubstitutes(existingDetail, detailDto.Substitutes);
                }
            }
            else
            {
                // --- افزودن سطر جدید ---
                var newDetail = new BOMDetail
                {
                    // اینجا چون bom موجود است، می‌توانیم Id آن را بدهیم
                    // یا 0 بدهیم (چون به کالکشن اضافه می‌شود EF میفهمد)
                    // اما چون bom از قبل Track شده، دادن Id صریح امن‌تر است
                    BOMHeaderId = bom.Id, 
                    
                    ChildProductId = detailDto.ChildProductId,
                    Quantity = detailDto.Quantity,
                    InputQuantity = detailDto.InputQuantity,
                    InputUnitId = detailDto.InputUnitId,
                    WastePercentage = detailDto.WastePercentage
                };

                // افزودن جایگزین‌های جدید
                if (detailDto.Substitutes != null)
                {
                    foreach (var subDto in detailDto.Substitutes)
                    {
                        newDetail.Substitutes.Add(new BOMSubstitute
                        {
                            // دیتیل جدید هنوز ID ندارد، پس 0 میگذاریم
                            BOMDetailId = 0, 
                            
                            SubstituteProductId = subDto.SubstituteProductId,
                            Factor = subDto.Factor,
                            Priority = subDto.Priority,
                            IsMixAllowed = subDto.IsMixAllowed,
                            MaxMixPercentage = subDto.MaxMixPercentage,
                            Note = subDto.Note
                        });
                    }
                }
                
                // افزودن به کالکشن هدر
                bom.Details.Add(newDetail);
            }
        }

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new Exception("این رکورد توسط کاربر دیگری تغییر کرده است.");
        }

        return true;
    }

    private void UpdateSubstitutes(BOMDetail detail, List<BOMSubstituteUpdateDto>? dtos)
    {
        if (dtos == null) return;

        var reqSubIds = dtos.Where(s => s.Id.HasValue && s.Id > 0).Select(s => s.Id!.Value).ToList();
        var subsToDelete = detail.Substitutes.Where(s => !reqSubIds.Contains(s.Id)).ToList();
        
        foreach (var s in subsToDelete) detail.Substitutes.Remove(s);

        foreach (var subDto in dtos)
        {
            if (subDto.Id.HasValue && subDto.Id > 0)
            {
                var existing = detail.Substitutes.FirstOrDefault(s => s.Id == subDto.Id);
                if (existing != null)
                {
                    existing.SubstituteProductId = subDto.SubstituteProductId;
                    existing.Factor = subDto.Factor;
                    existing.Priority = subDto.Priority;
                    existing.IsMixAllowed = subDto.IsMixAllowed;
                    existing.MaxMixPercentage = subDto.MaxMixPercentage;
                    existing.Note = subDto.Note;
                }
            }
            else
            {
                detail.Substitutes.Add(new BOMSubstitute
                {
                    // دیتیل موجود است، پس ID اش را داریم
                    BOMDetailId = detail.Id,
                    
                    SubstituteProductId = subDto.SubstituteProductId,
                    Factor = subDto.Factor,
                    Priority = subDto.Priority,
                    IsMixAllowed = subDto.IsMixAllowed,
                    MaxMixPercentage = subDto.MaxMixPercentage,
                    Note = subDto.Note
                });
            }
        }
    }
}