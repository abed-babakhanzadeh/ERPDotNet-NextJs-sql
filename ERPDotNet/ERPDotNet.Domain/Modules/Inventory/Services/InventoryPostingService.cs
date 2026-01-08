using ERPDotNet.Domain.Common;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using ERPDotNet.Domain.Modules.Inventory.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Models;

namespace ERPDotNet.Domain.Modules.Inventory.Services;

public class InventoryPostingService : IInventoryPostingService
{
    private readonly IInventoryDomainRepository _repository;

    public InventoryPostingService(IInventoryDomainRepository repository)
    {
        _repository = repository;
    }

    public async Task<InventoryPostingResult> ProcessDocumentAsync(InventoryPostingContext context, CancellationToken cancellationToken)
    {
        var sign = context.DocType.Nature == InventoryNature.Input 
            ? InventoryTransactionSign.Increase 
            : InventoryTransactionSign.Decrease;

        return await ExecutePostingLogicAsync(context, sign, isReversal: false, cancellationToken);
    }

    public async Task<InventoryPostingResult> ReverseDocumentAsync(InventoryPostingContext originalContext, CancellationToken cancellationToken)
    {
        // در ابطال، جهت برعکس می‌شود
        var reverseSign = originalContext.DocType.Nature == InventoryNature.Input 
            ? InventoryTransactionSign.Decrease 
            : InventoryTransactionSign.Increase;

        return await ExecutePostingLogicAsync(originalContext, reverseSign, isReversal: true, cancellationToken);
    }

    private async Task<InventoryPostingResult> ExecutePostingLogicAsync(
        InventoryPostingContext context, 
        InventoryTransactionSign operationSign, 
        bool isReversal, 
        CancellationToken cancellationToken)
    {
        var transactions = new List<InventoryTransaction>();
        var stockUpdates = new List<CurrentStock>();
        var errors = new List<string>();
        var events = new List<BaseEvent>();

        int multiplier = operationSign == InventoryTransactionSign.Increase ? 1 : -1;

        foreach (var detail in context.Header.Details)
        {
            var quantity = detail.MainUnitQuantity;

            // === 1. مدیریت Reversal (لینک به سند اصلی) ===
            long? relatedTransactionId = null;
            if (isReversal)
            {
                // باید تراکنش اصلی را پیدا کنیم
                relatedTransactionId = await _repository.GetLastTransactionIdAsync(detail.Id, cancellationToken);
                
                if (relatedTransactionId == null)
                {
                    errors.Add($"تراکنش اصلی برای سطر {detail.Id} جهت ابطال یافت نشد. (شاید سند قبلاً ثبت نشده است)");
                    continue; 
                }
            }

            // === 2. ساخت تراکنش ===
            var transaction = new InventoryTransaction
            {
                FiscalYearId = context.Header.FiscalYearId,
                TransactionDate = DateTime.UtcNow,
                DocHeaderId = context.Header.Id,
                DocDetailId = detail.Id,
                DocTypeId = context.Header.DocTypeId,
                ProductId = detail.ProductId,
                WarehouseId = context.Header.WarehouseId,
                LocationId = detail.LocationId,
                BatchId = detail.BatchId,
                Sign = operationSign,
                Quantity = quantity,
                RelatedTransactionId = relatedTransactionId // لینک واقعی به تراکنش اصلی
            };
            transactions.Add(transaction);

            // === 3. دریافت موجودی ===
            var currentStock = await _repository.GetCurrentStockAsync(
                context.Header.WarehouseId, 
                detail.ProductId, 
                detail.LocationId, 
                detail.BatchId, 
                cancellationToken);

            // هندل کردن نبود رکورد موجودی
            if (currentStock == null)
            {
                // اگر خروج است و موجودی صفر است -> خطا (مگر اینکه پالیسی اجازه دهد)
                if (operationSign == InventoryTransactionSign.Decrease && !context.Policy.CanGoNegative(context.DocType, context.Header.WarehouseId))
                {
                    errors.Add($"موجودی کافی برای کالای {detail.ProductId} وجود ندارد (موجودی صفر).");
                    continue;
                }

                currentStock = new CurrentStock
                {
                    WarehouseId = context.Header.WarehouseId,
                    ProductId = detail.ProductId,
                    LocationId = detail.LocationId,
                    BatchId = detail.BatchId,
                    QuantityOnHand = 0,
                    QuantityReserved = 0
                };
            }

            // === 4. چک کردن قوانین (Policies) ===
            
            // الف) چک کردن موجودی منفی
            if (operationSign == InventoryTransactionSign.Decrease)
            {
                if ((currentStock.QuantityOnHand - quantity) < 0 && !context.Policy.CanGoNegative(context.DocType, context.Header.WarehouseId))
                {
                    errors.Add($"موجودی ناکافی: کالای {detail.ProductId}، موجود: {currentStock.QuantityOnHand}، درخواست: {quantity}");
                    continue;
                }
            }

            // ب) مدیریت بچ (انقضا و مسدودی)
            if (detail.BatchId.HasValue)
            {
                // آیا نیاز به چک کردن بچ هست؟
                bool checkExpiry = context.Policy.ShouldCheckExpiry(context.DocType);
                bool checkBlock = context.Policy.ShouldCheckBatchBlockStatus(context.DocType);

                if (checkExpiry || checkBlock)
                {
                    var batch = await _repository.GetBatchAsync(detail.BatchId.Value, cancellationToken);
                    if (batch != null)
                    {
                        // 1. چک مسدودی (Block Status) - اصلاح شده
                        if (checkBlock && batch.IsBlocked)
                        {
                             errors.Add($"بچ {batch.BatchNumber} مسدود است. دلیل: {batch.BlockReason}");
                             continue;
                        }

                        // 2. چک انقضا
                        // معمولاً انقضا فقط موقع "خروج" مهم است، اما طبق پالیسی عمل می‌کنیم
                        if (checkExpiry && operationSign == InventoryTransactionSign.Decrease && batch.ExpiryDate < context.Header.DocDate)
                        {
                            errors.Add($"بچ {batch.BatchNumber} منقضی شده است.");
                            continue;
                        }
                    }
                }
            }

            // === 5. محاسبه موجودی (Mutation) ===
            currentStock.QuantityOnHand += (quantity * multiplier);
            
            if (!stockUpdates.Contains(currentStock))
            {
                stockUpdates.Add(currentStock);
            }
        }

        if (errors.Any())
        {
            return InventoryPostingResult.Failure(errors.ToArray());
        }

        return InventoryPostingResult.Success(transactions, stockUpdates, events);
    }
}