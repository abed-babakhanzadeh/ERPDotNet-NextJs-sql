using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Constants;
using ERPDotNet.Application.Common.Exceptions; // استفاده از کلاس جدید
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

// نکته: CacheInvalidation کلی را برداشتیم تا دستی و دقیق انجام دهیم (Tier-0 Optimization)
public record PostInventoryDocCommand : IRequest<bool>
{
    public long Id { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
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
    private readonly ICacheService _cacheService; // اضافه شد برای مدیریت دقیق کش
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
        
        // 1. Load & Track
        var doc = await _context.InventoryDocHeaders
            .Include(x => x.DocType)
            .Include(x => x.Details)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        // قانون Tier-0: فقط اسناد تایید شده قابل قطعی شدن هستند
        if (doc!.Status != InventoryDocStatus.Approved)
        {
            throw new BusinessRuleException(
                $"سند در وضعیت {doc.Status} است. برای قطعی‌سازی، سند باید ابتدا 'تایید' (Approve) شود.");
        }

        if (doc == null) 
            throw new KeyNotFoundException($"Inventory Document {request.Id} not found.");

        // 2. Idempotency
        if (doc.Status == InventoryDocStatus.Posted)
            throw new InvalidOperationException("Document is already posted.");

        if (doc.Status == InventoryDocStatus.Cancelled)
            throw new InvalidOperationException("Cannot post a cancelled document.");

        // 3. Concurrency
        _context.Entry(doc).Property(x => x.RowVersion).OriginalValue = request.RowVersion;

        // 4. Build Context
        var postingContext = new InventoryPostingContext
        {
            Header = doc,
            DocType = doc.DocType!,
            Policy = _policy,
            UserId = long.TryParse(_currentUserService.UserId, out var uid) ? uid : null
        };

        // 5. Domain Logic
        var result = await _postingService.ProcessDocumentAsync(postingContext, cancellationToken);

        if (!result.IsSuccess)
        {
            // استفاده از Exception اختصاصی بیزینس (اصلاح Tier-1)
            throw new BusinessRuleException(result.Errors);
        }

        // 6. Apply Changes
        
        // A) Ledger
        if (result.GeneratedTransactions.Any())
        {
            await _context.InventoryTransactions.AddRangeAsync(result.GeneratedTransactions, cancellationToken);
        }

        // B) Snapshot Update (Highly Optimized)
        foreach (var stock in result.UpdatedStocks)
        {
            if (stock.Id == 0)
            {
                await _context.CurrentStocks.AddAsync(stock, cancellationToken);
            }
            else
            {
                // اگر انتیتی Detached بود (بعید است ولی برای اطمینان)
                if (_context.Entry(stock).State == EntityState.Detached)
                {
                    _context.CurrentStocks.Attach(stock);
                    // فقط فیلد موجودی را Modified می‌کنیم، نه کل رکورد را (جلوگیری از Overwrite سایر فیلدها)
                    _context.Entry(stock).Property(x => x.QuantityOnHand).IsModified = true;
                }
                // اگر Attached است، خود EF تغییرات را Track کرده و نیازی به کد نیست.
            }
        }

        // 7. Change Status
        doc.Status = InventoryDocStatus.Posted;

        // 8. Atomic Save
        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new Exception("Document was modified by another user. Please refresh.");
        }

        // 9. Fully Granular Cache Invalidation (Tier-0 Optimization)
        // به جای اینکه کل کش موجودی را پاک کنیم، دقیقاً فقط آنهایی که تغییر کرده‌اند را پاک می‌کنیم.
        // این کار باعث می‌شود سایر کاربران که با کالاهای دیگر کار می‌کنند، همچنان از کش استفاده کنند (Hit Rate بالا).
        
        var cacheTasks = new List<Task>();

        foreach (var stock in result.UpdatedStocks)
        {
            // ساخت کلید دقیق برای موجودی لحظه‌ای
            var stockKey = CacheKeys.CurrentStock(stock.WarehouseId, stock.ProductId);
            cacheTasks.Add(_cacheService.RemoveAsync(stockKey, cancellationToken));

            // ساخت کلید دقیق برای کاردکس (چون تراکنش جدید اضافه شده، کاردکس آن کالا هم بیات شده)
            var cardexKey = CacheKeys.ProductCardex(stock.WarehouseId, stock.ProductId);
            cacheTasks.Add(_cacheService.RemoveAsync(cardexKey, cancellationToken));
        }

        // اجرای همزمان همه حذف‌ها (Performance Boost)
        await Task.WhenAll(cacheTasks);
        // === 10. Domain Event Publishing (Tier-0) ===
        // حالا که تراکنش قطعی شد، به بقیه سیستم خبر می‌دهیم
        // (این کارсинک است، اگر Async بخواهید باید Outbox Pattern استفاده کنید که فعلاً لازم نیست)
        await _publisher.Publish(new InventoryDocPostedEvent(doc), cancellationToken);

        return true;
    }
}