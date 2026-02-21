using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Enums;
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

    public RevertInventoryDocHandler(IApplicationDbContext context, IInventoryPostingService postingService)
    {
        _context = context;
        _postingService = postingService;
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
                Policy = null!, // در ابطال معمولاً سیاست "موجودی منفی" چک نمی‌شود چون داریم بار را برمی‌گردانیم/کسر می‌کنیم
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
            foreach (var stockUpdate in result.UpdatedStocks)
            {
                var existingStock = await _context.CurrentStocks
                    .FirstOrDefaultAsync(x => 
                        x.WarehouseId == stockUpdate.WarehouseId && 
                        x.ProductId == stockUpdate.ProductId &&
                        x.BatchId == stockUpdate.BatchId && 
                        x.LocationId == stockUpdate.LocationId, 
                        cancellationToken);

                if (existingStock != null)
                {
                    // stockUpdate.QuantityOnHand در اینجا مقدار معکوس دارد (مثلاً -10 یا +5)
                    // پس با جمع کردن، اثر سند قبلی خنثی می‌شود.
                    existingStock.QuantityOnHand += stockUpdate.QuantityOnHand;
                }
                else
                {
                    // اگر به هر دلیلی رکورد موجودی نبود (که بعید است)، ایجاد می‌کنیم
                    await _context.CurrentStocks.AddAsync(stockUpdate, cancellationToken);
                }
            }

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