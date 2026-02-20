using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Workflow.Contracts;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using ERPDotNet.Domain.Modules.Inventory.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Models;
using ERPDotNet.Domain.Modules.Inventory.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ERPDotNet.Application.Modules.Inventory.ActionHandlers;

// 🌟 این کلاس فرزند IBpmsActionHandler است تا موتور آن را بشناسد
public class PostInventoryDocActionHandler : IBpmsActionHandler
{
    private readonly IApplicationDbContext _context;
    private readonly IInventoryPostingService _postingService;
    private readonly IInventoryPostingPolicy _policy;
    private readonly ILogger<PostInventoryDocActionHandler> _logger;

    public PostInventoryDocActionHandler(
        IApplicationDbContext context,
        IInventoryPostingService postingService,
        IInventoryPostingPolicy policy,
        ILogger<PostInventoryDocActionHandler> logger)
    {
        _context = context;
        _postingService = postingService;
        _policy = policy;
        _logger = logger;
    }

    public async Task ExecuteAsync(BpmsActionContext context, CancellationToken cancellationToken)
    {
        _logger.LogInformation("شروع عملیات قطعی‌سازی سند انبار {RecordId} از طریق موتور BPMS", context.TargetRecordId);

        // 1. لود سند
        var doc = await _context.InventoryDocHeaders
            .Include(x => x.DocType)
            .Include(x => x.Details)
            .FirstOrDefaultAsync(x => x.Id == context.TargetRecordId, cancellationToken);

        if (doc == null)
            throw new KeyNotFoundException($"سند انبار با شناسه {context.TargetRecordId} یافت نشد.");

        // اگر قبلاً قطعی شده بود (Idempotency)
        if (doc.Status == InventoryDocStatus.Posted) return;

        // 2. آماده‌سازی کانتکست دامین
        var postingContext = new InventoryPostingContext
        {
            Header = doc,
            DocType = doc.DocType!,
            Policy = _policy,
            UserId = long.TryParse(context.UserId, out var uid) ? uid : null
        };

        // 3. اجرای منطق خالص دامین (Core Business)
        var result = await _postingService.ProcessDocumentAsync(postingContext, cancellationToken);

        if (!result.IsSuccess)
        {
            // 🌟 پرتاب خطا باعث می‌شود موتور BPMS کل Transaction را Rollback کند!
            throw new BusinessRuleException(string.Join("\n", result.Errors));
        }


        // 4. ثبت تراکنش‌ها در EF (بدون SaveChanges)
        if (result.GeneratedTransactions.Any())
        {
            await _context.InventoryTransactions.AddRangeAsync(result.GeneratedTransactions, cancellationToken);
        }

        // 🌟 5. بروزرسانی موجودی‌ها در EF (همراه با گارد محافظتی هم‌روندی)
        if (result.UpdatedStocks.Any())
        {
            var warehouseIds = result.UpdatedStocks.Select(s => s.WarehouseId).Distinct().ToList();
            var productIds = result.UpdatedStocks.Select(s => s.ProductId).Distinct().ToList();

            var existingStocks = await _context.CurrentStocks
                .Where(x => warehouseIds.Contains(x.WarehouseId) && productIds.Contains(x.ProductId))
                .ToListAsync(cancellationToken);

            foreach (var stockUpdate in result.UpdatedStocks)
            {
                var existingStock = existingStocks.FirstOrDefault(x => 
                    x.WarehouseId == stockUpdate.WarehouseId && 
                    x.ProductId == stockUpdate.ProductId &&
                    x.BatchId == stockUpdate.BatchId && 
                    x.LocationId == stockUpdate.LocationId);

                if (existingStock == null)
                {
                    // گارد محافظ: اگر کالا کلاً وجود ندارد و ما داریم خروج می‌زنیم
                    if (stockUpdate.QuantityOnHand < 0 && !_policy.CanGoNegative(doc.DocType!, stockUpdate.WarehouseId))
                    {
                        throw new BusinessRuleException($"موجودی کالای {stockUpdate.ProductId} برای خروج از انبار کافی نیست.");
                    }

                    await _context.CurrentStocks.AddAsync(stockUpdate, cancellationToken);
                    existingStocks.Add(stockUpdate); 
                }
                else
                {
                    // 🌟 گارد محافظتی اصلی (Race Condition Guard): 
                    // بررسی موجودی دقیقاً در لحظه جمع و تفریق حافظه
                    var newQuantity = existingStock.QuantityOnHand + stockUpdate.QuantityOnHand;
                    
                    if (newQuantity < 0 && !_policy.CanGoNegative(doc.DocType!, existingStock.WarehouseId))
                    {
                        throw new BusinessRuleException($"به دلیل ثبت اسناد همزمان، موجودی کالای {existingStock.ProductId} به اتمام رسیده است و امکان خروج وجود ندارد.");
                    }

                    existingStock.QuantityOnHand = newQuantity;
                }
            }
        }

        // 6. تغییر وضعیت سند
        doc.Status = InventoryDocStatus.Posted;
        doc.LastModifiedAt = DateTime.UtcNow;

        // یادآوری: SaveChangesAsync صدا زده نمی‌شود!
        _logger.LogInformation("سند انبار {RecordId} با موفقیت توسط ماژول پردازش شد.", context.TargetRecordId);
        }
}