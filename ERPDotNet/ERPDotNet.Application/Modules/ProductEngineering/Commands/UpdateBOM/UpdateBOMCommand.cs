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
    public required string Version { get; set; }
    public BOMType Type { get; set; }
    public BOMStatus Status { get; set; }
    public bool IsActive { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime? ToDate { get; set; }

    // کنترل همروندی
    public byte[]? RowVersion { get; set; }

    // لیست اقلام (مواد اولیه)
    public List<BOMDetailUpdateDto> Details { get; set; } = new();
}

public record BOMDetailUpdateDto
{
    public int? Id { get; set; } // اگر نال یا صفر باشد = رکورد جدید
    public int ChildProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal InputQuantity { get; set; }
    public int InputUnitId { get; set; }
    public decimal WastePercentage { get; set; }

    // لیست جایگزین‌ها
    public List<BOMSubstituteUpdateDto> Substitutes { get; set; } = new();
}

public record BOMSubstituteUpdateDto
{
    public int? Id { get; set; } // اگر نال یا صفر باشد = رکورد جدید
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

        RuleFor(v => v.Id).GreaterThan(0);
        RuleFor(v => v.Title).NotEmpty().MaximumLength(100);
        RuleFor(v => v.Version).NotEmpty().MaximumLength(20);

        // چک کردن یکتایی ورژن (غیر از خودش)
        RuleFor(v => v)
            .MustAsync(BeUniqueVersion)
            .WithMessage("این نسخه BOM برای این کالا قبلاً ثبت شده است.");

        // ولیدیشن اقلام
        RuleForEach(v => v.Details).ChildRules(d => {
            d.RuleFor(x => x.ChildProductId).GreaterThan(0);
            d.RuleFor(x => x.Quantity).GreaterThan(0);
            
            // === رفع ارور دسترسی به ChildProductId ===
            // استفاده از Must روی کل آبجکت DetailDto برای دسترسی همزمان به ChildProductId و لیست Substitutes
            d.RuleFor(detail => detail)
             .Must(detail => !detail.Substitutes.Any(s => s.SubstituteProductId == detail.ChildProductId))
             .WithMessage("کالای جایگزین نمی‌تواند همان کالای اصلی باشد.");

            // ولیدیشن داخلی جایگزین‌ها
            d.RuleForEach(s => s.Substitutes).ChildRules(sub => {
                sub.RuleFor(x => x.SubstituteProductId).GreaterThan(0);
            });
        });
    }

    private async Task<bool> BeUniqueVersion(UpdateBOMCommand model, CancellationToken token)
    {
        var currentBom = await _context.BOMHeaders
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == model.Id, token);

        if (currentBom == null) return true;

        return !await _context.BOMHeaders
            .AnyAsync(x => x.ProductId == currentBom.ProductId && 
                           x.Version == model.Version && 
                           x.Id != model.Id, token);
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
        // 1. لود کردن کامل (Deep Load) با AsSplitQuery برای پرفورمنس SQL Server
        var entity = await _context.BOMHeaders
            .Include(x => x.Details)
                .ThenInclude(d => d.Substitutes)
            .AsSplitQuery() // بهینه‌سازی کوئری
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (entity == null) return false;

        // 2. کنترل همروندی (Optimistic Concurrency)
        if (request.RowVersion != null && request.RowVersion.Length > 0)
        {
            _context.Entry(entity).Property(x => x.RowVersion).OriginalValue = request.RowVersion;
        }

        // 3. آپدیت هدر
        var utcFrom = request.FromDate.Kind == DateTimeKind.Utc ? request.FromDate : DateTime.SpecifyKind(request.FromDate, DateTimeKind.Utc);
        DateTime? utcTo = null;
        if (request.ToDate.HasValue)
            utcTo = request.ToDate.Value.Kind == DateTimeKind.Utc ? request.ToDate.Value : DateTime.SpecifyKind(request.ToDate.Value, DateTimeKind.Utc);

        entity.Title = request.Title;
        entity.Version = request.Version;
        entity.Type = request.Type;
        // entity.Status = request.Status;
        entity.IsActive = request.IsActive;
        entity.FromDate = utcFrom;
        entity.ToDate = utcTo;

        // 4. سینک کردن اقلام (Smart Sync)
        var requestDetailIds = request.Details
            .Where(d => d.Id.HasValue && d.Id.Value > 0)
            .Select(d => d.Id!.Value)
            .ToList();

        // الف) حذف شده‌ها
        var detailsToDelete = entity.Details.Where(d => !requestDetailIds.Contains(d.Id)).ToList();
        foreach (var del in detailsToDelete)
        {
            _context.BOMDetails.Remove(del);
        }

        // ب) افزودن یا ویرایش
        foreach (var detailDto in request.Details)
        {
            BOMDetail currentDetail;

            if (detailDto.Id.HasValue && detailDto.Id.Value > 0)
            {
                // --- ویرایش سطر موجود ---
                currentDetail = entity.Details.FirstOrDefault(d => d.Id == detailDto.Id.Value)!;
                if (currentDetail == null) continue;

                currentDetail.ChildProductId = detailDto.ChildProductId;
                currentDetail.Quantity = detailDto.Quantity;
                currentDetail.InputQuantity = detailDto.InputQuantity;
                currentDetail.InputUnitId = detailDto.InputUnitId;
                currentDetail.WastePercentage = detailDto.WastePercentage;
            }
            else
            {
                // --- افزودن سطر جدید ---
                currentDetail = new BOMDetail
                {
                    // === رفع ارور Required Member ===
                    BOMHeaderId = entity.Id, // اتصال به هدر فعلی
                    
                    ChildProductId = detailDto.ChildProductId,
                    Quantity = detailDto.Quantity,
                    InputQuantity = detailDto.InputQuantity,
                    InputUnitId = detailDto.InputUnitId,
                    WastePercentage = detailDto.WastePercentage
                };
                entity.Details.Add(currentDetail);
            }

            // 5. سینک کردن جایگزین‌ها (Smart Sync سطح دوم)
            var requestSubIds = detailDto.Substitutes
                .Where(s => s.Id.HasValue && s.Id.Value > 0)
                .Select(s => s.Id!.Value)
                .ToList();

            var subsToDelete = currentDetail.Substitutes
                .Where(s => !requestSubIds.Contains(s.Id))
                .ToList();
            
            foreach (var subDel in subsToDelete)
            {
                _context.BOMSubstitutes.Remove(subDel);
            }

            foreach (var subDto in detailDto.Substitutes)
            {
                if (subDto.Id.HasValue && subDto.Id.Value > 0)
                {
                    // ویرایش جایگزین
                    var existingSub = currentDetail.Substitutes.FirstOrDefault(s => s.Id == subDto.Id.Value);
                    if (existingSub != null)
                    {
                        existingSub.SubstituteProductId = subDto.SubstituteProductId;
                        existingSub.Priority = subDto.Priority;
                        existingSub.Factor = subDto.Factor;
                        existingSub.IsMixAllowed = subDto.IsMixAllowed;
                        existingSub.MaxMixPercentage = subDto.MaxMixPercentage;
                        existingSub.Note = subDto.Note;
                    }
                }
                else
                {
                    // افزودن جایگزین جدید
                    currentDetail.Substitutes.Add(new BOMSubstitute
                    {
                        // === رفع ارور Required Member ===
                        BOMDetailId = 0, // مقدار موقت (چون هنوز ID دیتیل جدید قطعی نیست یا EF هندل میکند)
                        
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

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new Exception("این فرمول توسط کاربر دیگری ویرایش شده است. لطفاً صفحه را رفرش کنید.");
        }

        return true;
    }
}