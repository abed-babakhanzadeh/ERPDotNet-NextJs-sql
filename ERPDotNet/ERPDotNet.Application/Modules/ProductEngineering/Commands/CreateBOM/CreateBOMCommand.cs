using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.ProductEngineering.Commands.CreateBOM;

[CacheInvalidation("BOMs")] 
public record CreateBOMCommand : IRequest<int>
{
    public required int ProductId { get; set; }
    public required string Title { get; set; }
    public int Version { get; set; }
    public BOMUsage Usage { get; set; } = BOMUsage.Main; 
    public BOMType Type { get; set; } = BOMType.Manufacturing;
    public DateTime FromDate { get; set; } = DateTime.UtcNow;
    public DateTime? ToDate { get; set; }
    public bool IsActive { get; set; } = true;

    public List<BOMDetailInputDto> Details { get; set; } = new();
}

public record BOMDetailInputDto
{
    public required int ChildProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal InputQuantity { get; set; }
    public int InputUnitId { get; set; }
    public decimal WastePercentage { get; set; }
    public List<BOMSubstituteInputDto> Substitutes { get; set; } = new();
}

public record BOMSubstituteInputDto
{
    public required int SubstituteProductId { get; set; }
    public int Priority { get; set; }
    public decimal Factor { get; set; }
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

        RuleFor(v => v.ProductId).GreaterThan(0).WithMessage("انتخاب محصول الزامی است.");
        RuleFor(v => v.Title).NotEmpty().MaximumLength(100).WithMessage("عنوان فرمول الزامی است.");
        RuleFor(v => v.Version).GreaterThan(0).WithMessage("شماره نسخه باید بزرگتر از صفر باشد.");

        RuleFor(v => v.ToDate)
            .GreaterThan(v => v.FromDate)
            .When(v => v.ToDate.HasValue)
            .WithMessage("تاریخ پایان باید بعد از تاریخ شروع باشد.");
        
        // 1. چک کردن تکراری بودن ورژن
        RuleFor(v => v)
            .MustAsync(BeUniqueVersion)
            .WithMessage("این شماره نسخه برای محصول مورد نظر تکراری است.");

        // 2. جلوگیری از ثبت دو فرمول اصلی فعال
        RuleFor(v => v)
            .MustAsync(NotHaveDuplicateActiveMain)
            .WithMessage("برای این محصول قبلاً یک فرمول 'اصلی' فعال ثبت شده است. لطفاً فرمول جدید را 'فرعی' ثبت کنید یا قبلی را غیرفعال نمایید.");
        
        // 3. جلوگیری از لوپ (پدر فرزند خودش نباشد) - منتقل شده از هندلر به اینجا
        RuleFor(x => x)
            .Must(NotBeCircularDependency)
            .WithMessage("خطای مهندسی: محصول نهایی نمی‌تواند به عنوان زیرمجموعه خودش استفاده شود (لوپ تولید).");

        // 4. جلوگیری از تکرار کالا در لیست مواد (اضافه شد)
        RuleFor(x => x.Details)
            .Must(details => details.Select(d => d.ChildProductId).Distinct().Count() == details.Count)
            .WithMessage("یک کالا نمی‌تواند چند بار در لیست مواد اولیه تکرار شود.");

        // ولیدیشن داخلی اقلام
        RuleForEach(v => v.Details).SetValidator(new BOMDetailInputValidator());
    }

    private async Task<bool> BeUniqueVersion(CreateBOMCommand command, CancellationToken token)
    {
        return !await _context.BOMHeaders.IgnoreQueryFilters()
            .AnyAsync(x => x.ProductId == command.ProductId && x.Version == command.Version, token);
    }

    private async Task<bool> NotHaveDuplicateActiveMain(CreateBOMCommand command, CancellationToken token)
    {
        if (command.Usage != BOMUsage.Main || !command.IsActive) return true;

        return !await _context.BOMHeaders
            .AnyAsync(x => x.ProductId == command.ProductId 
                           && x.Usage == BOMUsage.Main 
                           && x.IsActive == true
                           && x.IsDeleted == false, token);
    }

    private bool NotBeCircularDependency(CreateBOMCommand command)
    {
        // هیچکدام از فرزندان نباید برابر با ProductId باشند
        return !command.Details.Any(d => d.ChildProductId == command.ProductId);
    }
}

public class BOMDetailInputValidator : AbstractValidator<BOMDetailInputDto>
{
    public BOMDetailInputValidator()
    {
        RuleFor(x => x.ChildProductId).GreaterThan(0).WithMessage("کالا انتخاب نشده است.");
        RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("مقدار مصرف باید بیشتر از صفر باشد.");
        RuleFor(x => x.WastePercentage).InclusiveBetween(0, 100).WithMessage("درصد ضایعات نامعتبر است.");
        
        RuleForEach(x => x.Substitutes).SetValidator(new BOMSubstituteInputValidator());
    }
}

public class BOMSubstituteInputValidator : AbstractValidator<BOMSubstituteInputDto>
{
    public BOMSubstituteInputValidator()
    {
        RuleFor(x => x.SubstituteProductId).GreaterThan(0).WithMessage("کالای جایگزین نامعتبر است.");
        RuleFor(x => x.Factor).GreaterThan(0).WithMessage("ضریب جایگزین باید بیشتر از صفر باشد.");
        RuleFor(x => x.MaxMixPercentage).InclusiveBetween(0, 100);
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
        // هندلر تمیز شد: ولیدیشن‌ها به کلاس Validator منتقل شدند

        var utcFromDate = request.FromDate.Kind == DateTimeKind.Utc 
            ? request.FromDate 
            : DateTime.SpecifyKind(request.FromDate, DateTimeKind.Utc);

        DateTime? utcToDate = null;
        if (request.ToDate.HasValue)
        {
            utcToDate = request.ToDate.Value.Kind == DateTimeKind.Utc
                ? request.ToDate.Value
                : DateTime.SpecifyKind(request.ToDate.Value, DateTimeKind.Utc);
        }

        var bom = new BOMHeader
        {
            ProductId = request.ProductId,
            Title = request.Title,
            Version = request.Version,
            Usage = request.Usage,
            Type = request.Type,
            FromDate = utcFromDate,
            ToDate = utcToDate,
            Status = BOMStatus.Active, 
            IsActive = request.IsActive
        };

        foreach (var detailInput in request.Details)
        {
            var detail = new BOMDetail
            {
                BOMHeaderId = 0,
                ChildProductId = detailInput.ChildProductId,
                Quantity = detailInput.Quantity,
                InputQuantity = detailInput.InputQuantity,
                InputUnitId = detailInput.InputUnitId,
                WastePercentage = detailInput.WastePercentage
            };

            foreach (var subInput in detailInput.Substitutes)
            {
                detail.Substitutes.Add(new BOMSubstitute
                {
                    BOMDetailId = 0,
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

        _context.BOMHeaders.Add(bom);
        await _context.SaveChangesAsync(cancellationToken);

        return bom.Id;
    }
}