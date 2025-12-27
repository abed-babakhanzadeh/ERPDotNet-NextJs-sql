using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.ProductEngineering.Commands.CopyBOM;

[CacheInvalidation("BOMs")]
public record CopyBOMCommand : IRequest<int>
{
    public int SourceBomId { get; set; }      // آی‌دی فرمول مبدا
    public required string NewVersion { get; set; } // ورژن جدید (مثلا 1.1)
    public string? NewTitle { get; set; }     // عنوان جدید (اختیاری)
}

public class CopyBOMValidator : AbstractValidator<CopyBOMCommand>
{
    private readonly IApplicationDbContext _context;

    public CopyBOMValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(v => v.SourceBomId).GreaterThan(0);
        RuleFor(v => v.NewVersion).NotEmpty().MaximumLength(20);

        // ولیدیشن پیچیده: آیا برای "محصولِ این BOM"، قبلاً این ورژن ثبت شده؟
        RuleFor(v => v)
            .MustAsync(BeUniqueVersionForProduct)
            .WithMessage("این نسخه برای کالای مورد نظر قبلاً وجود دارد.");
    }

    private async Task<bool> BeUniqueVersionForProduct(CopyBOMCommand command, CancellationToken token)
    {
        // 1. پیدا کردن محصول پدر از روی BOM مبدا
        var sourceBomProductId = await _context.BOMHeaders
            .Where(b => b.Id == command.SourceBomId)
            .Select(b => b.ProductId)
            .FirstOrDefaultAsync(token);

        if (sourceBomProductId == 0) return false; // اصلا BOM مبدا وجود ندارد

        // 2. چک کردن تکراری بودن ورژن برای آن محصول
        var exists = await _context.BOMHeaders
            .AnyAsync(b => b.ProductId == sourceBomProductId && b.Version == command.NewVersion, token);
        
        return !exists;
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
        // 1. لود کردن کامل BOM مبدا (Deep Load)
        // نکته حیاتی: AsNoTracking برای کپی کردن الزامی است
        var sourceBom = await _context.BOMHeaders
            .AsNoTracking()
            .Include(x => x.Details)
                .ThenInclude(d => d.Substitutes)
                .AsSplitQuery() // <--- این خط اضافه شد برای پرفورمنس SQL Server
            .FirstOrDefaultAsync(x => x.Id == request.SourceBomId, cancellationToken);

        if (sourceBom == null) 
            throw new KeyNotFoundException("فرمول مبدا یافت نشد.");

        // 2. ساخت هدر جدید (مپ کردن دستی)
        var newBom = new BOMHeader
        {
            ProductId = sourceBom.ProductId, // محصول همان است
            Title = request.NewTitle ?? sourceBom.Title, // اگر عنوان جدید نداد، قبلی را بگذار
            Version = request.NewVersion,    // ورژن جدید
            
            Type = sourceBom.Type,
            Status = BOMStatus.Active,       // طبق قانون پروژه فعلی، فعال ایجاد می‌شود
            FromDate = DateTime.UtcNow,
            IsActive = true
        };

        // 3. کپی کردن دیتیل‌ها (Deep Copy)
        foreach (var sourceDetail in sourceBom.Details)
        {
            var newDetail = new BOMDetail
            {
                // ID ها را ست نمی‌کنیم تا دیتابیس جدید بسازد
                BOMHeaderId = 0, 
                ChildProductId = sourceDetail.ChildProductId,
                Quantity = sourceDetail.Quantity,
                WastePercentage = sourceDetail.WastePercentage
            };

            // 4. کپی کردن جایگزین‌ها
            foreach (var sourceSub in sourceDetail.Substitutes)
            {
                newDetail.Substitutes.Add(new BOMSubstitute
                {
                    BOMDetailId = 0,
                    SubstituteProductId = sourceSub.SubstituteProductId,
                    Priority = sourceSub.Priority,
                    Factor = sourceSub.Factor
                });
            }

            newBom.Details.Add(newDetail);
        }

        // 5. ذخیره نهایی
        _context.BOMHeaders.Add(newBom);
        await _context.SaveChangesAsync(cancellationToken);

        return newBom.Id;
    }
}