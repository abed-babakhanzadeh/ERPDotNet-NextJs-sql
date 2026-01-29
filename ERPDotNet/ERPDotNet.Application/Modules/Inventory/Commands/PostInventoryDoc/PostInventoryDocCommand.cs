using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Constants;
using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using ERPDotNet.Domain.Modules.Inventory.Events;
using ERPDotNet.Domain.Modules.Inventory.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Models;
using ERPDotNet.Domain.Modules.Inventory.Services;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.PostInventoryDoc;

// تغییر به کلاس معمولی برای جلوگیری از ابهام فیلد/پراپرتی
public class PostInventoryDocCommand : IRequest<bool>
{
    public long Id { get; set; }
    
    // حتما باید { get; set; } داشته باشد تا Validator کار کند
    public string RowVersion { get; set; } = string.Empty;
}

public class PostInventoryDocValidator : AbstractValidator<PostInventoryDocCommand>
{
    public PostInventoryDocValidator()
    {
        RuleFor(v => v.Id).GreaterThan(0);
        RuleFor(v => v.RowVersion).NotEmpty().WithMessage("RowVersion is required.");
    }
}

public class PostInventoryDocHandler : IRequestHandler<PostInventoryDocCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IInventoryPostingService _postingService;
    private readonly IInventoryPostingPolicy _policy;
    private readonly ICurrentUserService _currentUserService;
    private readonly ICacheService _cacheService;
    private readonly IPublisher _publisher;

    public PostInventoryDocHandler(
        IApplicationDbContext context, 
        IInventoryPostingService postingService,
        IInventoryPostingPolicy policy,
        ICurrentUserService currentUserService,
        ICacheService cacheService, 
        IPublisher publisher)
    {
        _context = context;
        _postingService = postingService;
        _policy = policy;
        _currentUserService = currentUserService;
        _cacheService = cacheService;
        _publisher = publisher;
    }

    public async Task<bool> Handle(PostInventoryDocCommand request, CancellationToken cancellationToken)
    {
        // 1. لود کردن هدر سند
        var doc = await _context.InventoryDocHeaders
            .Include(x => x.DocType)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (doc == null) 
            throw new KeyNotFoundException($"سند انبار با شناسه {request.Id} یافت نشد.");

        // =========================================================
        // 🛠️ لود کردن دستی اقلام (Direct Query) - تضمین لود شدن اقلام
        // =========================================================
        var details = await _context.InventoryDocDetails
            .Where(d => d.HeaderId == request.Id)
            .ToListAsync(cancellationToken);

        // اتصال دستی به هدر
        doc.Details = details;

        // گارد: اگر واقعا خالی بود خطا بده
        if (!doc.Details.Any())
        {
            throw new BusinessRuleException("این سند فاقد اقلام (Details) است. سند خالی قابل پردازش نیست.");
        }

        // چک وضعیت (باید تایید شده باشد)
        if (doc.Status != InventoryDocStatus.Approved)
        {
            throw new BusinessRuleException($"سند در وضعیت {doc.Status} است. برای قطعی‌سازی ابتدا باید تایید (Approve) شود.");
        }

        // 2. کنترل همروندی (Optimistic Concurrency)
        try 
        {
            var rowVersionBytes = Convert.FromBase64String(request.RowVersion);
            _context.Entry(doc).Property(x => x.RowVersion).OriginalValue = rowVersionBytes;
        }
        catch 
        { 
            throw new ValidationException("RowVersion نامعتبر است."); 
        }

        // 3. آماده‌سازی کانتکست سرویس دامنه
        var postingContext = new InventoryPostingContext
        {
            Header = doc,
            DocType = doc.DocType!,
            Policy = _policy,
            UserId = long.TryParse(_currentUserService.UserId, out var uid) ? uid : null
        };

        // 4. اجرای محاسبات (Inventory Posting Service)
        var result = await _postingService.ProcessDocumentAsync(postingContext, cancellationToken);

        if (!result.IsSuccess)
            throw new BusinessRuleException(result.Errors);

        // 5. ذخیره تراکنش‌های تولید شده
        if (result.GeneratedTransactions.Any())
        {
            await _context.InventoryTransactions.AddRangeAsync(result.GeneratedTransactions, cancellationToken);
        }

        // 6. بروزرسانی موجودی لحظه‌ای (Current Stock)
        foreach (var stockUpdate in result.UpdatedStocks)
        {
            // جستجو برای رکورد موجود
            var existingStock = await _context.CurrentStocks
                .FirstOrDefaultAsync(x => 
                    x.WarehouseId == stockUpdate.WarehouseId && 
                    x.ProductId == stockUpdate.ProductId &&
                    x.BatchId == stockUpdate.BatchId && 
                    x.LocationId == stockUpdate.LocationId, 
                    cancellationToken);

            if (existingStock == null)
            {
                // ایجاد رکورد جدید
                await _context.CurrentStocks.AddAsync(stockUpdate, cancellationToken);
            }
            else
            {
                // آپدیت رکورد موجود
                existingStock.QuantityOnHand += stockUpdate.QuantityOnHand;
                // علامت‌گذاری جهت آپدیت
                _context.Entry(existingStock).State = EntityState.Modified;
            }
        }

        // 7. تغییر وضعیت نهایی سند
        doc.Status = InventoryDocStatus.Posted;
        doc.LastModifiedAt = DateTime.UtcNow;

        // 8. ذخیره نهایی در دیتابیس (Commit)
        await _context.SaveChangesAsync(cancellationToken);

        // 9. پاکسازی کش
        var cacheTasks = new List<Task>();
        foreach (var stock in result.UpdatedStocks)
        {
            cacheTasks.Add(_cacheService.RemoveAsync(CacheKeys.CurrentStock(stock.WarehouseId, stock.ProductId), cancellationToken));
        }
        await Task.WhenAll(cacheTasks);

        // 10. انتشار رویداد
        await _publisher.Publish(new InventoryDocPostedEvent(doc), cancellationToken);

        return true;
    }
}