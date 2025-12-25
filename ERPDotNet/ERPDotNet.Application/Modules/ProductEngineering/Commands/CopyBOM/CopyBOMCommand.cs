using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.ProductEngineering.Commands.CopyBOM;

[CacheInvalidation("BOMs", "BOMTree")]
public record CopyBOMCommand : IRequest<int>
{
    public int SourceBomId { get; set; }      // آی‌دی فرمول مبدا
    public int TargetProductId { get; set; }  // محصولی که قرار است این فرمول برایش کپی شود
    public required string NewVersion { get; set; } // ورژن جدید (مثلا 1.1)
    public string? NewTitle { get; set; }     // عنوان جدید (اختیاری)
}

public class CopyBOMValidator : AbstractValidator<CopyBOMCommand>
{
    private readonly IApplicationDbContext _context;

    public CopyBOMValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(v => v.SourceBomId)
            .GreaterThan(0).WithMessage("شناسه فرمول مبدا نامعتبر است.")
            .MustAsync(async (id, token) => await _context.BOMHeaders.AnyAsync(b => b.Id == id, token))
            .WithMessage("فرمول مبدا یافت نشد.");

        RuleFor(v => v.TargetProductId)
            .GreaterThan(0).WithMessage("محصول مقصد نامعتبر است.")
            .MustAsync(async (id, token) => await _context.Products.AnyAsync(p => p.Id == id, token))
            .WithMessage("محصول مقصد در سیستم یافت نشد.");

        RuleFor(v => v.NewVersion)
            .NotEmpty().WithMessage("وارد کردن نسخه (Version) الزامی است.")
            .MaximumLength(20).WithMessage("طول فیلد نسخه نمی‌تواند بیشتر از 20 کاراکتر باشد.");

        // ولیدیشن مهم: آیا برای محصول مقصد، قبلاً این ورژن ثبت شده؟
        RuleFor(v => v)
            .MustAsync(async (cmd, token) =>
            {
                return !await _context.BOMHeaders.AnyAsync(b => 
                    b.ProductId == cmd.TargetProductId && 
                    b.Version == cmd.NewVersion, token);
            })
            .WithMessage("برای محصول مقصد، قبلاً فرمولی با این شماره نسخه ثبت شده است.");

        // ولیدیشن پیشرفته: جلوگیری از کپی کردن BOM روی خودش به عنوان فرزند (چرخه)
        // اگر محصول مقصد، یکی از اقلام داخل BOM مبدا باشد، چرخه ایجاد می‌شود!
        RuleFor(v => v)
            .MustAsync(async (cmd, token) =>
            {
                var sourceDetailProductIds = await _context.BOMDetails
                    .Where(d => d.BOMHeaderId == cmd.SourceBomId)
                    .Select(d => d.ChildProductId)
                    .ToListAsync(token);

                // محصول مقصد نباید در لیست مواد اولیه فرمول مبدا باشد
                return !sourceDetailProductIds.Contains(cmd.TargetProductId);
            })
            .WithMessage("خطای چرخه تولید: محصول مقصد، خودش یکی از مواد اولیه فرمول مبدا است.");
    }
}

public class CopyBOMHandler : IRequestHandler<CopyBOMCommand, int>
{
    private readonly IApplicationDbContext _context;

    public CopyBOMHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CopyBOMCommand request, CancellationToken cancellationToken)
    {
        // 1. دریافت BOM مبدا با تمام جزئیات (Include Deep)
        var sourceBom = await _context.BOMHeaders
            .Include(b => b.Details)
                .ThenInclude(d => d.Substitutes)
            .AsNoTracking() // کپی بدون ترکینگ برای جلوگیری از تداخل ID
            .FirstOrDefaultAsync(b => b.Id == request.SourceBomId, cancellationToken);

        if (sourceBom == null) throw new Exception("BOM مبدا یافت نشد.");

        // 2. ساخت BOM جدید
        var newBom = new BOMHeader
        {
            ProductId = request.TargetProductId,
            Title = request.NewTitle ?? $"{sourceBom.Title} - کپی",
            Version = request.NewVersion,
            Type = sourceBom.Type,
            Status = BOMStatus.Draft, // کپی معمولاً پیش‌نویس است تا تایید شود
            FromDate = DateTime.UtcNow,
            IsActive = true,
            Details = new List<BOMDetail>()
        };

        // 3. کپی کردن دیتیل‌ها
        foreach (var sourceDetail in sourceBom.Details)
        {
            var newDetail = new BOMDetail
            {
                // برای راضی کردن required و چون هنوز هدر جدید ID ندارد، 0 می‌گذاریم
                // EF Core خودش Relation را هندل می‌کند
                BOMHeaderId = 0, 
                
                ChildProductId = sourceDetail.ChildProductId,
                Quantity = sourceDetail.Quantity,
                InputQuantity = sourceDetail.InputQuantity,
                InputUnitId = sourceDetail.InputUnitId,
                WastePercentage = sourceDetail.WastePercentage,
                Substitutes = new List<BOMSubstitute>()
            };

            // 4. کپی کردن جایگزین‌ها
            foreach (var sourceSub in sourceDetail.Substitutes)
            {
                newDetail.Substitutes.Add(new BOMSubstitute
                {
                    // اینجا هم 0 می‌گذاریم
                    BOMDetailId = 0,
                    
                    SubstituteProductId = sourceSub.SubstituteProductId,
                    Priority = sourceSub.Priority,
                    Factor = sourceSub.Factor,
                    IsMixAllowed = sourceSub.IsMixAllowed,
                    MaxMixPercentage = sourceSub.MaxMixPercentage,
                    Note = sourceSub.Note
                });
            }

            newBom.Details.Add(newDetail);
        }

        _context.BOMHeaders.Add(newBom);
        await _context.SaveChangesAsync(cancellationToken);

        return newBom.Id;
    }
}