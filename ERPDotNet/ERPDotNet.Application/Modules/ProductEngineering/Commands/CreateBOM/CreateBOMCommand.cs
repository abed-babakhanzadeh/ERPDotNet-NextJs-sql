using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.ProductEngineering.Commands.CreateBOM;

// باطل کردن کش لیست BOMها
[CacheInvalidation("BOMs")] 
public record CreateBOMCommand : IRequest<int>
{
    public required int ProductId { get; set; }
    public required string Title { get; set; }
    public string Version { get; set; } = "1.0"; // پیش‌فرض
    public BOMType Type { get; set; } = BOMType.Manufacturing;
    public DateTime FromDate { get; set; } = DateTime.UtcNow;
    public DateTime? ToDate { get; set; }
    public bool IsActive { get; set; } = true;

    // لیست مواد اولیه (دیتیل)
    public List<BOMDetailInputDto> Details { get; set; } = new();
}

public record BOMDetailInputDto
{
    public required int ChildProductId { get; set; }
    public decimal Quantity { get; set; }
    // --- فیلدهای جدید ---
    public decimal InputQuantity { get; set; }
    public int InputUnitId { get; set; }
    // -------------------
    public decimal WastePercentage { get; set; }
    
    // لیست جایگزین‌های این ماده
    public List<BOMSubstituteInputDto> Substitutes { get; set; } = new();
}

public record BOMSubstituteInputDto
{
    public required int SubstituteProductId { get; set; }
    public int Priority { get; set; }
    public decimal Factor { get; set; }
    // فیلدهای جدید
    public bool IsMixAllowed { get; set; }
    public decimal MaxMixPercentage { get; set; }
    public string? Note { get; set; }
}

public class CreateBOMValidator : AbstractValidator<CreateBOMCommand>
{
    private readonly IApplicationDbContext _context;

    public CreateBOMValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(v => v.ToDate)
            .GreaterThan(v => v.FromDate)
            .When(v => v.ToDate.HasValue)
            .WithMessage("تاریخ پایان باید بعد از تاریخ شروع باشد.");

        RuleFor(v => v.ProductId).GreaterThan(0);
        RuleFor(v => v.Title).NotEmpty().MaximumLength(100);
        RuleFor(v => v.Version).NotEmpty().MaximumLength(20);
        
        // چک کردن تکراری نبودن ورژن برای این کالا
        RuleFor(v => v)
            .MustAsync(BeUniqueVersion).WithMessage("این نسخه BOM برای این کالا قبلاً ثبت شده است.");

        RuleForEach(v => v.Details).ChildRules(d => {
            d.RuleFor(x => x.ChildProductId).GreaterThan(0);
            d.RuleFor(x => x.Quantity).GreaterThan(0);
            
            // چک: ماده اولیه نباید خودِ محصول نهایی باشد (سیکل ساده)
            d.RuleFor(x => x.ChildProductId)
             .NotEqual(root => root.ChildProductId) // این جا دسترسی به روت سخته، تو هندلر چک میکنیم بهتره
             .WithMessage("محصول نمی‌تواند زیرمجموعه خودش باشد.");
        });
    }

    private async Task<bool> BeUniqueVersion(CreateBOMCommand model, CancellationToken token)
    {
        return !await _context.BOMHeaders
            .AnyAsync(x => x.ProductId == model.ProductId && x.Version == model.Version, token);
    }
}

public class CreateBOMHandler : IRequestHandler<CreateBOMCommand, int>
{
    private readonly IApplicationDbContext _context;

    public CreateBOMHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CreateBOMCommand request, CancellationToken cancellationToken)
    {

        // --- رفع خطای تاریخ PostgreSQL (UTC Conversion) ---
        
        // 1. تبدیل تاریخ شروع به UTC
        var utcFromDate = request.FromDate.Kind == DateTimeKind.Utc 
            ? request.FromDate 
            : DateTime.SpecifyKind(request.FromDate, DateTimeKind.Utc);

        // 2. تبدیل تاریخ پایان به UTC (اگر مقدار داشت)
        DateTime? utcToDate = null;
        if (request.ToDate.HasValue)
        {
            utcToDate = request.ToDate.Value.Kind == DateTimeKind.Utc
                ? request.ToDate.Value
                : DateTime.SpecifyKind(request.ToDate.Value, DateTimeKind.Utc);
        }

        // ساخت هدر با تاریخ‌های اصلاح شده
        var bom = new BOMHeader
        {
            ProductId = request.ProductId,
            Title = request.Title,
            Version = request.Version,
            Type = request.Type,
            
            FromDate = utcFromDate, // استفاده از متغیر UTC شده
            ToDate = utcToDate,     // استفاده از متغیر UTC شده (فیلد جدید)
            
            Status = BOMStatus.Active, 
            IsActive = request.IsActive
        };

        // 2. افزودن دیتیل‌ها و جایگزین‌ها
        foreach (var detailInput in request.Details)
        {
            // جلوگیری از سیکل ساده (خودش فرزند خودش نباشد)
            if (detailInput.ChildProductId == request.ProductId)
            {
                throw new Exception($"کالای {detailInput.ChildProductId} نمی‌تواند زیرمجموعه خودش باشد.");
            }

            var detail = new BOMDetail
            {
                // BOMHeaderId خودکار بعد از ذخیره ست می‌شود (چون نویگیشن است)
                BOMHeaderId = 0, // موقت
                ChildProductId = detailInput.ChildProductId,
                Quantity = detailInput.Quantity,
                // مقادیر ورودی کاربر (برای نمایش بعدی)
                InputQuantity = detailInput.InputQuantity,
                InputUnitId = detailInput.InputUnitId,
                WastePercentage = detailInput.WastePercentage
            };

            // افزودن جایگزین‌ها
            foreach (var subInput in detailInput.Substitutes)
            {
                detail.Substitutes.Add(new BOMSubstitute
                {
                    BOMDetailId = 0, // موقت
                    SubstituteProductId = subInput.SubstituteProductId,
                    Priority = subInput.Priority,
                    Factor = subInput.Factor,
                    IsMixAllowed = subInput.IsMixAllowed,
                    MaxMixPercentage = subInput.MaxMixPercentage,
                    Note = subInput.Note
                });
            }

            bom.Details.Add(detail);
        }

        // 3. ذخیره اتمیک
        _context.BOMHeaders.Add(bom);
        
        // EF Core به صورت خودکار همه فرزندان و نوه‌ها را در یک تراکنش ذخیره می‌کند
        await _context.SaveChangesAsync(cancellationToken);

        return bom.Id;
    }
}
