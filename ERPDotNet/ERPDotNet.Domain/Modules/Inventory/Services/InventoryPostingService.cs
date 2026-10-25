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
        return await ExecutePostingLogicAsync(context, isReversal: false, cancellationToken);
    }

    public async Task<InventoryPostingResult> ReverseDocumentAsync(InventoryPostingContext originalContext, CancellationToken cancellationToken)
    {
        // در ابطال، جهت هر حرکت برعکس می‌شود
        return await ExecutePostingLogicAsync(originalContext, isReversal: true, cancellationToken);
    }

    // هر سطر سند به یک یا دو «حرکت» تبدیل می‌شود:
    // رسید: افزایش در انبار سند | حواله: کاهش از انبار سند | انتقال: کاهش از مبدأ + افزایش در مقصد
    private sealed record StockMovement(int WarehouseId, int? LocationId, InventoryTransactionSign Sign);

    private async Task<InventoryPostingResult> ExecutePostingLogicAsync(
        InventoryPostingContext context,
        bool isReversal,
        CancellationToken cancellationToken)
    {
        var transactions = new List<InventoryTransaction>();
        var stockUpdates = new List<CurrentStock>();
        var errors = new List<string>();
        var events = new List<BaseEvent>();
        // سطرهای تکراری با انبار/کالا/لوکیشن/بچ یکسان باید روی یک رکورد موجودی جمع شوند
        var stocksByKey = new Dictionary<(int WarehouseId, int ProductId, int? LocationId, int? BatchId), CurrentStock>();

        var header = context.Header;
        var nature = context.DocType.Nature;

        if (nature == InventoryNature.Transfer &&
            (!header.DestinationWarehouseId.HasValue || header.DestinationWarehouseId == header.WarehouseId))
        {
            return InventoryPostingResult.Failure("سند انتقال باید انبار مقصدی متفاوت از انبار مبدأ داشته باشد.");
        }

        foreach (var detail in header.Details)
        {
            var quantity = detail.MainUnitQuantity;
            if (nature == InventoryNature.Transfer && !isReversal && !detail.DestinationLocationId.HasValue)
            {
                errors.Add($"لوکیشن مقصد برای کالای {detail.ProductId} مشخص نشده است.");
                continue;
            }

            // بچ باید متعلق به همان کالای سطر باشد؛ در ابطال همان اثر قبلی برمی‌گردد و دوباره بررسی نمی‌شود
            if (!isReversal && detail.BatchId.HasValue)
            {
                var batch = await _repository.GetBatchAsync(detail.BatchId.Value, cancellationToken);
                if (batch == null || batch.ProductId != detail.ProductId)
                {
                    errors.Add($"بچ انتخاب‌شده متعلق به کالای {detail.ProductId} نیست.");
                    continue;
                }
            }

            foreach (var plannedMovement in GetMovements(context, detail, isReversal))
            {
                var movement = plannedMovement;

                // === 1. مدیریت Reversal (لینک به تراکنش اصلی همان انبار) ===
                long? relatedTransactionId = null;
                if (isReversal)
                {
                    var original = await _repository.GetLastTransactionAsync(detail.Id, movement.WarehouseId, cancellationToken);

                    if (original == null)
                    {
                        errors.Add($"تراکنش اصلی برای سطر {detail.Id} جهت ابطال یافت نشد. (شاید سند قبلاً ثبت نشده است)");
                        continue;
                    }

                    relatedTransactionId = original.Id;
                    // ابطال دقیقاً همان لوکیشنی را برمی‌گرداند که تراکنش اصلی تغییر داده بود
                    movement = movement with { LocationId = original.LocationId };
                }

                var isDecrease = movement.Sign == InventoryTransactionSign.Decrease;

                // === 2. دریافت موجودی ===
                var stockKey = (movement.WarehouseId, detail.ProductId, movement.LocationId, detail.BatchId);
                if (!stocksByKey.TryGetValue(stockKey, out var currentStock))
                {
                    currentStock = await _repository.GetCurrentStockAsync(
                        movement.WarehouseId,
                        detail.ProductId,
                        movement.LocationId,
                        detail.BatchId,
                        cancellationToken);
                }

                var canGoNegative = context.Policy.CanGoNegative(context.DocType, movement.WarehouseId);

                if (currentStock == null)
                {
                    // اگر خروج است و موجودی صفر است -> خطا (مگر اینکه پالیسی اجازه دهد)
                    if (isDecrease && !canGoNegative)
                    {
                        errors.Add($"موجودی کافی برای کالای {detail.ProductId} وجود ندارد (موجودی صفر).");
                        continue;
                    }

                    currentStock = new CurrentStock
                    {
                        WarehouseId = movement.WarehouseId,
                        ProductId = detail.ProductId,
                        LocationId = movement.LocationId,
                        BatchId = detail.BatchId,
                        QuantityOnHand = 0,
                        QuantityReserved = 0
                    };
                }

                // === 3. چک کردن قوانین (Policies) ===

                // الف) چک کردن موجودی منفی
                if (isDecrease && (currentStock.QuantityOnHand - quantity) < 0 && !canGoNegative)
                {
                    errors.Add($"موجودی ناکافی: کالای {detail.ProductId}، موجود: {currentStock.QuantityOnHand}، درخواست: {quantity}");
                    continue;
                }

                // ب) مدیریت بچ (انقضا و مسدودی)
                var batchError = await ValidateBatchAsync(context, detail, isDecrease, cancellationToken);
                if (batchError != null)
                {
                    errors.Add(batchError);
                    continue;
                }

                // === 4. ساخت تراکنش ===
                transactions.Add(new InventoryTransaction
                {
                    FiscalYearId = header.FiscalYearId,
                    TransactionDate = DateTime.UtcNow,
                    DocHeaderId = header.Id,
                    DocDetailId = detail.Id,
                    DocTypeId = header.DocTypeId,
                    ProductId = detail.ProductId,
                    WarehouseId = movement.WarehouseId,
                    LocationId = movement.LocationId,
                    BatchId = detail.BatchId,
                    Sign = movement.Sign,
                    Quantity = quantity,
                    RelatedTransactionId = relatedTransactionId // لینک واقعی به تراکنش اصلی
                });

                // === 5. محاسبه موجودی (Mutation) ===
                // QuantityOnHand پس از این خط مقدار نهایی است، نه مقدار تغییر
                currentStock.QuantityOnHand += quantity * (int)movement.Sign;

                if (stocksByKey.TryAdd(stockKey, currentStock))
                {
                    stockUpdates.Add(currentStock);
                }
            }
        }

        if (errors.Any())
        {
            return InventoryPostingResult.Failure(errors.ToArray());
        }

        return InventoryPostingResult.Success(transactions, stockUpdates, events);
    }

    private static List<StockMovement> GetMovements(
        InventoryPostingContext context,
        InventoryDocDetail detail,
        bool isReversal)
    {
        var header = context.Header;
        var increase = isReversal ? InventoryTransactionSign.Decrease : InventoryTransactionSign.Increase;
        var decrease = isReversal ? InventoryTransactionSign.Increase : InventoryTransactionSign.Decrease;

        switch (context.DocType.Nature)
        {
            case InventoryNature.Input:
                return [new StockMovement(header.WarehouseId, detail.LocationId, increase)];

            case InventoryNature.Transfer:
                var destinationWarehouseId = header.DestinationWarehouseId!.Value;
                // در ابطال ابتدا اثر مقصد برداشته می‌شود تا کنترل موجودی منفی مقصد قبل از برگشت به مبدأ انجام شود
                var outOfSource = new StockMovement(header.WarehouseId, detail.LocationId, decrease);
                var intoDestination = new StockMovement(destinationWarehouseId, detail.DestinationLocationId, increase);
                return isReversal ? [intoDestination, outOfSource] : [outOfSource, intoDestination];

            default:
                return [new StockMovement(header.WarehouseId, detail.LocationId, decrease)];
        }
    }

    private async Task<string?> ValidateBatchAsync(
        InventoryPostingContext context,
        InventoryDocDetail detail,
        bool isDecrease,
        CancellationToken cancellationToken)
    {
        if (!detail.BatchId.HasValue) return null;

        bool checkExpiry = context.Policy.ShouldCheckExpiry(context.DocType);
        bool checkBlock = context.Policy.ShouldCheckBatchBlockStatus(context.DocType);
        if (!checkExpiry && !checkBlock) return null;

        var batch = await _repository.GetBatchAsync(detail.BatchId.Value, cancellationToken);
        if (batch == null) return null;

        if (checkBlock && batch.IsBlocked)
        {
            return $"بچ {batch.BatchNumber} مسدود است. دلیل: {batch.BlockReason}";
        }

        // انقضا فقط موقع "خروج" مهم است
        if (checkExpiry && isDecrease && batch.ExpiryDate < context.Header.DocDate)
        {
            return $"بچ {batch.BatchNumber} منقضی شده است.";
        }

        return null;
    }
}
