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

public class PostInventoryDocCommand : IRequest<bool>
{
    public long Id { get; set; }
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
        // 1. لود استاندارد هدر و اقلام با Include (امن‌ترین روش)
        var doc = await _context.InventoryDocHeaders
            .Include(x => x.DocType)
            .Include(x => x.Details) // لود اقلام در همین کوئری
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (doc == null) 
            throw new KeyNotFoundException($"سند انبار با شناسه {request.Id} یافت نشد.");

        // اگر قبلاً پست شده، کاری نکن (Idempotency)
        if (doc.Status == InventoryDocStatus.Posted) return true;

        if (!doc.Details.Any())
            throw new BusinessRuleException("این سند فاقد اقلام است و قابل قطعی‌سازی نیست.");

        if (doc.Status != InventoryDocStatus.Approved)
            throw new BusinessRuleException("سند باید در وضعیت تایید شده (Approved) باشد.");

        // 2. کنترل همروندی
        try 
        {
            var rowVersionBytes = Convert.FromBase64String(request.RowVersion);
            _context.Entry(doc).Property(x => x.RowVersion).OriginalValue = rowVersionBytes;
        }
        catch 
        { 
            throw new ValidationException("داده‌ها توسط کاربر دیگری تغییر کرده است. لطفاً صفحه را رفرش کنید."); 
        }

        // 3. محاسبات دامین
        var context = new InventoryPostingContext
        {
            Header = doc,
            DocType = doc.DocType!,
            Policy = _policy,
            UserId = long.TryParse(_currentUserService.UserId, out var uid) ? uid : null
        };

        var result = await _postingService.ProcessDocumentAsync(context, cancellationToken);

        if (!result.IsSuccess)
        {
            // تبدیل لیست خطاها به یک رشته واحد برای جلوگیری از خطای احتمالی سریالایزیشن
            throw new BusinessRuleException(string.Join("\n", result.Errors));
        }

        // 4. ذخیره تراکنش‌ها
        if (result.GeneratedTransactions.Any())
        {
            await _context.InventoryTransactions.AddRangeAsync(result.GeneratedTransactions, cancellationToken);
        }

        // 5. بروزرسانی موجودی (Current Stock)
        foreach (var stockUpdate in result.UpdatedStocks)
        {
            var existingStock = await _context.CurrentStocks
                .FirstOrDefaultAsync(x => 
                    x.WarehouseId == stockUpdate.WarehouseId && 
                    x.ProductId == stockUpdate.ProductId &&
                    x.BatchId == stockUpdate.BatchId && 
                    x.LocationId == stockUpdate.LocationId, 
                    cancellationToken);

            if (existingStock == null)
            {
                await _context.CurrentStocks.AddAsync(stockUpdate, cancellationToken);
            }
            else
            {
                existingStock.QuantityOnHand += stockUpdate.QuantityOnHand;
            }
        }

        // 6. تغییر وضعیت
        doc.Status = InventoryDocStatus.Posted;
        doc.LastModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        // 7. عملیات پس از ذخیره (در بلوک try-catch جداگانه تا اگر خطا داد، تراکنش اصلی رول‌بک نشود یا کلاینت 500 نگیرد)
        try
        {
            var cacheTasks = result.UpdatedStocks
                .Select(stock => _cacheService.RemoveAsync(CacheKeys.CurrentStock(stock.WarehouseId, stock.ProductId), cancellationToken));
            await Task.WhenAll(cacheTasks);

            await _publisher.Publish(new InventoryDocPostedEvent(doc), cancellationToken);
        }
        catch
        {
            // فقط لاگ کنید، چون سند عملاً پست شده است
            // _logger.LogError("Error in post-posting operations");
        }

        return true;
    }
}

