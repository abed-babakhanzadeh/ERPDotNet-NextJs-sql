using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.BaseInfo.Contracts;
using ERPDotNet.Application.Modules.Inventory.Extensions;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using ERPDotNet.Domain.Modules.Inventory.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Models;
using ERPDotNet.Domain.Modules.Inventory.Services; // ✅ اضافه شد
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.RevertInventoryDoc;

[CacheInvalidation("InventoryDocs")]
public record RevertInventoryDocCommand(long Id) : IRequest<bool>;

public class RevertInventoryDocHandler : IRequestHandler<RevertInventoryDocCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IInventoryPostingService _postingService; // ✅ تزریق سرویس دامین
    private readonly IInventoryPostingPolicy _policy;
    private readonly IFiscalYearService _fiscalYears;

    public RevertInventoryDocHandler(
        IApplicationDbContext context,
        IInventoryPostingService postingService,
        IInventoryPostingPolicy policy,
        IFiscalYearService fiscalYears)
    {
        _fiscalYears = fiscalYears;
        _context = context;
        _postingService = postingService;
        _policy = policy;
    }

    public async Task<bool> Handle(RevertInventoryDocCommand request, CancellationToken cancellationToken)
    {
        // ✅ اصلاح حیاتی: لود کردن اقلام و نوع سند (برای محاسبه معکوس ضروری است)
        var doc = await _context.InventoryDocHeaders
            .Include(x => x.DocType)
            .Include(x => x.Details)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (doc == null)
            throw new KeyNotFoundException($"سند با شناسه {request.Id} یافت نشد.");

        // اگر قبلاً باطل شده، کاری نکن
        if (doc.Status == InventoryDocStatus.Cancelled)
            throw new BusinessRuleException("این سند قبلاً باطل شده است.");

        await _fiscalYears.EnsureOpenAsync(doc.FiscalYearId, cancellationToken);

        // در این حالت تراکنش مالی وجود ندارد، پس فقط وضعیت را به پیش‌نویس برمی‌گردانیم تا قابل ویرایش شود.
        // === سناریوی ۱: سند هنوز قطعی نشده ===
        if (doc.Status == InventoryDocStatus.Approved || doc.Status == InventoryDocStatus.InProcess)
        {
            doc.Status = InventoryDocStatus.Draft;
            // اگر فیلدهای تایید کننده دارد، آن‌ها را پاک کنید (اختیاری)
            // doc.ApprovedBy = null; 
            // doc.ApprovedAt = null;
            
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        // === سناریوی ۲: سند قطعی شده (Posted) ===
        // در این حالت سند نباید ویرایش شود. باید "باطل" شود و اثر آن در انبار خنثی گردد.
        if (doc.Status == InventoryDocStatus.Posted)
        {
            // ساخت کانتکست برای سرویس دامین
            var context = new InventoryPostingContext
            {
                Header = doc,
                DocType = doc.DocType!,
                // ابطال رسید موجودی را کم می‌کند و باید مثل حواله از منفی شدن موجودی جلوگیری کند
                Policy = _policy,
                UserId = 1 // TODO: آی‌دی کاربر جاری را از ICurrentUserService بگیرید
            };

            // ✅ فراخوانی متد Reverse در سرویس دامین
            // این متد باید لیست تراکنش‌های معکوس (با مقدار منفی) و آپدیت‌های موجودی را تولید کند
            var result = await _postingService.ReverseDocumentAsync(context, cancellationToken);

            if (!result.IsSuccess)
            {
                // نمایش خطای دقیق بیزینسی به کاربر
                throw new BusinessRuleException(string.Join("\n", result.Errors));
            }

            // 1. ثبت تراکنش‌های معکوس در دیتابیس
            if (result.GeneratedTransactions.Any())
            {
                await _context.InventoryTransactions.AddRangeAsync(result.GeneratedTransactions, cancellationToken);
            }

            // 2. اعمال تغییرات روی موجودی کالا (Current Stocks)
            await _context.AddNewStocksAsync(result.UpdatedStocks, cancellationToken);

            // 3. تغییر وضعیت سند به "ابطال شده" (Cancelled)
            // توجه: به Draft برنمی‌گردد چون سند دارای اثر مالی بوده و باید تاریخچه آن حفظ شود.
            doc.Status = InventoryDocStatus.Cancelled;
            doc.LastModifiedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        // اگر سند Draft بود، عملاً کاری انجام نمی‌شود (Idempotent)
        return true;
    }
}