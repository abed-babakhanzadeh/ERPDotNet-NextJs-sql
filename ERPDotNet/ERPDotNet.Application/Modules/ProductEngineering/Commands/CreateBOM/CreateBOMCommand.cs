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
    public string Version { get; set; } = "1.0"; 
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

        RuleFor(v => v.ToDate)
            .GreaterThan(v => v.FromDate)
            .When(v => v.ToDate.HasValue)
            .WithMessage("تاریخ پایان باید بعد از تاریخ شروع باشد.");

        RuleFor(v => v.ProductId).GreaterThan(0);
        RuleFor(v => v.Title).NotEmpty().MaximumLength(100);
        RuleFor(v => v.Version).NotEmpty().MaximumLength(20);
        
        RuleFor(v => v)
            .MustAsync(BeUniqueVersion).WithMessage("این نسخه BOM برای این کالا قبلاً ثبت شده است.");

        RuleForEach(v => v.Details).ChildRules(d => {
            d.RuleFor(x => x.ChildProductId).GreaterThan(0);
            d.RuleFor(x => x.Quantity).GreaterThan(0);
            
            // *** اصلاح مهم: خط باگ‌دار حذف شد ***
            // چک کردن اینکه فرزند != پدر باشد را در هندلر انجام می‌دهیم
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
        // 1. تبدیل تاریخ‌ها به UTC
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
            Type = request.Type,
            FromDate = utcFromDate,
            ToDate = utcToDate,
            Status = BOMStatus.Active, 
            IsActive = request.IsActive
        };

        foreach (var detailInput in request.Details)
        {
            // جلوگیری از سیکل ساده (اینجا جایش درست است)
            if (detailInput.ChildProductId == request.ProductId)
            {
                throw new Exception($"کالای {detailInput.ChildProductId} نمی‌تواند زیرمجموعه خودش باشد.");
            }

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