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
    public int SourceBomId { get; set; }
    
    // تغییر ۱: ورژن به عدد تبدیل شد
    public int NewVersion { get; set; } 
    
    public string? NewTitle { get; set; }
    
    // تغییر ۲: کاربر باید تعیین کند این کپی، اصلی است یا فرعی
    public BOMUsage TargetUsage { get; set; } = BOMUsage.Main;
    
    public bool IsActive { get; set; } = true;
}

public class CopyBOMValidator : AbstractValidator<CopyBOMCommand>
{
    private readonly IApplicationDbContext _context;

    public CopyBOMValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(v => v.SourceBomId).GreaterThan(0);
        RuleFor(v => v.NewVersion).GreaterThan(0);

        // ولیدیشن ۱: آیا ورژن تکراری است؟
        RuleFor(v => v)
            .MustAsync(BeUniqueVersionForProduct)
            .WithMessage("این شماره نسخه برای کالای مورد نظر قبلاً ثبت شده است.");

        // ولیدیشن ۲: جلوگیری از ثبت دو فرمول اصلی فعال (Business Rule)
        RuleFor(v => v)
            .MustAsync(NotHaveDuplicateActiveMain)
            .WithMessage("برای این محصول یک فرمول 'اصلی' فعال وجود دارد. لطفاً فرمول جدید را 'فرعی' ثبت کنید یا قبلی را غیرفعال نمایید.");
    }

    private async Task<bool> BeUniqueVersionForProduct(CopyBOMCommand command, CancellationToken token)
    {
        var sourceBomProductId = await GetProductId(command.SourceBomId, token);
        if (sourceBomProductId == 0) return true; // اگر سورس نیست، بگذار هندلر ارور 404 بدهد

        // چک می‌کنیم آیا ورژن تکراری هست یا نه (حتی حذف شده‌ها را هم چک می‌کنیم چون Unique Index داریم)
        var exists = await _context.BOMHeaders
            .IgnoreQueryFilters()
            .AnyAsync(b => b.ProductId == sourceBomProductId && b.Version == command.NewVersion, token);
        
        return !exists;
    }

    private async Task<bool> NotHaveDuplicateActiveMain(CopyBOMCommand command, CancellationToken token)
    {
        // اگر کاربر می‌خواهد "فرعی" بسازد یا "غیرفعال" بسازد، مشکلی نیست
        if (command.TargetUsage != BOMUsage.Main || !command.IsActive) return true;

        var sourceBomProductId = await GetProductId(command.SourceBomId, token);
        
        // چک می‌کنیم آیا "اصلیِ فعالِ دیگری" وجود دارد؟
        var hasActiveMain = await _context.BOMHeaders
            .AnyAsync(b => b.ProductId == sourceBomProductId 
                           && b.Usage == BOMUsage.Main 
                           && b.IsActive == true
                           && b.IsDeleted == false, token); // اینجا IsDeleted مهم است

        return !hasActiveMain;
    }

    // متد کمکی برای گرفتن ProductId
    private async Task<int> GetProductId(int bomId, CancellationToken token)
    {
        return await _context.BOMHeaders
            .IgnoreQueryFilters()
            .Where(b => b.Id == bomId)
            .Select(b => b.ProductId)
            .FirstOrDefaultAsync(token);
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
        // 1. لود کردن کامل BOM مبدا
        var sourceBom = await _context.BOMHeaders
            .AsNoTracking()
            .IgnoreQueryFilters() // اجازه کپی از فرمول‌های حذف شده یا غیرفعال
            .Include(x => x.Details)
                .ThenInclude(d => d.Substitutes)
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Id == request.SourceBomId, cancellationToken);

        if (sourceBom == null) 
            throw new KeyNotFoundException("فرمول مبدا یافت نشد.");

        // 2. ساخت هدر جدید
        var newBom = new BOMHeader
        {
            ProductId = sourceBom.ProductId,
            Title = request.NewTitle ?? sourceBom.Title + $" (v{request.NewVersion})",
            Version = request.NewVersion,
            Usage = request.TargetUsage, // تنظیم اصلی/فرعی بودن
            
            Type = sourceBom.Type,
            Status = BOMStatus.Draft, // معمولاً کپی جدید به صورت Draft ایجاد می‌شود تا بررسی شود
            FromDate = DateTime.UtcNow,
            IsActive = request.IsActive 
        };

        // 3. کپی کردن دیتیل‌ها (با تمام فیلدهای جدید)
        foreach (var sourceDetail in sourceBom.Details)
        {
            var newDetail = new BOMDetail
            {
                BOMHeaderId = 0,
                ChildProductId = sourceDetail.ChildProductId,
                
                // مقادیر محاسباتی
                Quantity = sourceDetail.Quantity,
                WastePercentage = sourceDetail.WastePercentage,
                
                // مقادیر ورودی کاربر (طبق فایل BOMDetail.cs)
                InputQuantity = sourceDetail.InputQuantity,
                InputUnitId = sourceDetail.InputUnitId
            };

            // 4. کپی کردن جایگزین‌ها
            foreach (var sourceSub in sourceDetail.Substitutes)
            {
                newDetail.Substitutes.Add(new BOMSubstitute
                {
                    BOMDetailId = 0,
                    SubstituteProductId = sourceSub.SubstituteProductId,
                    Priority = sourceSub.Priority,
                    Factor = sourceSub.Factor,
                    
                    // فیلدهای پیشرفته (طبق فایل BOMSubstitute.cs)
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