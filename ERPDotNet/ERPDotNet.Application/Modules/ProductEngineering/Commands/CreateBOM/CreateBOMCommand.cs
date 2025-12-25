using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.ProductEngineering.Commands.CreateBOM;

[CacheInvalidation("BOMs", "BOMTree")]
public record CreateBOMCommand : IRequest<int>
{
    public required string Title { get; set; }
    public required string Version { get; set; }
    public required int ProductId { get; set; }
    public int Type { get; set; } // از فرانت int می‌آید
    public DateTime FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public bool IsActive { get; set; }
    public List<BOMDetailInput> Details { get; set; } = new();
}

public class BOMDetailInput
{
    public int ChildProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal InputQuantity { get; set; } // ورودی کاربر
    public int InputUnitId { get; set; }       // واحد انتخابی کاربر
    public decimal WastePercentage { get; set; }
    public List<BOMSubstituteInput>? Substitutes { get; set; }
}

public class BOMSubstituteInput
{
    public int SubstituteProductId { get; set; }
    public decimal Factor { get; set; } = 1;
    public int Priority { get; set; } = 1;
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

        RuleFor(v => v.Title).NotEmpty().WithMessage("عنوان فرمول الزامی است.")
            .MaximumLength(100);
            
        RuleFor(v => v.Version).NotEmpty().WithMessage("نسخه فرمول الزامی است.")
            .MaximumLength(20);
        
        // 1. بررسی وجود محصول
        RuleFor(v => v.ProductId)
            .GreaterThan(0)
            .MustAsync(async (id, token) => await _context.Products.AnyAsync(p => p.Id == id, token))
            .WithMessage("محصول انتخاب شده معتبر نیست.");

        // 2. جلوگیری از BOM تکراری (همان محصول، همان ورژن)
        RuleFor(v => v)
            .MustAsync(async (model, token) => 
            {
                return !await _context.BOMHeaders
                    .AnyAsync(b => b.ProductId == model.ProductId && b.Version == model.Version, token);
            })
            .WithMessage("برای این محصول قبلاً فرمولی با این شماره نسخه ثبت شده است.");

        // اعتبارسنجی لیست اقلام
        RuleForEach(v => v.Details).ChildRules(d => {
            d.RuleFor(x => x.ChildProductId).GreaterThan(0).WithMessage("کالای سازنده (فرزند) انتخاب نشده است.");
            d.RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("مقدار مصرف باید بیشتر از صفر باشد.");
            d.RuleFor(x => x.WastePercentage).GreaterThanOrEqualTo(0).LessThan(100).WithMessage("درصد ضایعات نامعتبر است.");
        });

        // 3. جلوگیری از اقلام تکراری در لیست
        RuleFor(v => v.Details)
            .Must(details => details.Select(d => d.ChildProductId).Distinct().Count() == details.Count)
            .WithMessage("یک کالا نمی‌تواند چند بار در لیست اقلام تکرار شود.");

        // 4. جلوگیری از چرخه ساده (فرزند نباید خود پدر باشد)
        RuleFor(v => v)
            .Must(model => !model.Details.Any(d => d.ChildProductId == model.ProductId))
            .WithMessage("خطای چرخه: محصول نهایی نمی‌تواند به عنوان مواد اولیه خودش استفاده شود.");
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
        var bom = new BOMHeader
        {
            Title = request.Title,
            Version = request.Version,
            ProductId = request.ProductId,
            Type = (BOMType)request.Type, // تبدیل int به Enum
            FromDate = request.FromDate,
            ToDate = request.ToDate,
            IsActive = request.IsActive
        };

        foreach (var detailInput in request.Details)
        {
            var detail = new BOMDetail
            {
                // *** نکته کلیدی: مقداردهی 0 برای راضی کردن required ***
                // EF Core موقع ذخیره، خودش ID واقعی هدر را اینجا قرار می‌دهد
                BOMHeaderId = 0, 
                
                ChildProductId = detailInput.ChildProductId,
                Quantity = detailInput.Quantity,
                InputQuantity = detailInput.InputQuantity,
                InputUnitId = detailInput.InputUnitId,
                WastePercentage = detailInput.WastePercentage
            };

            if (detailInput.Substitutes != null && detailInput.Substitutes.Any())
            {
                foreach (var sub in detailInput.Substitutes)
                {
                    detail.Substitutes.Add(new BOMSubstitute
                    {
                        // *** اینجا هم 0 می‌گذاریم ***
                        BOMDetailId = 0,
                        
                        SubstituteProductId = sub.SubstituteProductId,
                        Factor = sub.Factor,
                        Priority = sub.Priority,
                        IsMixAllowed = sub.IsMixAllowed,
                        MaxMixPercentage = sub.MaxMixPercentage,
                        Note = sub.Note
                    });
                }
            }

            bom.Details.Add(detail);
        }

        _context.BOMHeaders.Add(bom);
        await _context.SaveChangesAsync(cancellationToken);

        return bom.Id;
    }
}