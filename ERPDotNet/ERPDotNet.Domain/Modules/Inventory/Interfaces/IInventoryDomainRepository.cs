using ERPDotNet.Domain.Modules.Inventory.Entities;

namespace ERPDotNet.Domain.Modules.Inventory.Interfaces;

// ارجاع به تراکنش ثبت‌شده: برای ابطال، لوکیشن از خود تراکنش اصلی خوانده می‌شود تا دقیقاً همان اثر برگردد
public sealed record PostedTransactionRef(long Id, int? LocationId);

public interface IInventoryDomainRepository
{
    // گرفتن موجودی لحظه‌ای
    Task<CurrentStock?> GetCurrentStockAsync(int warehouseId, int productId, int? locationId, int? batchId, CancellationToken cancellationToken);

    // گرفتن اطلاعات بچ
    Task<InventoryBatch?> GetBatchAsync(int batchId, CancellationToken cancellationToken);

    // آخرین تراکنش یک سطر سند در یک انبار (سطر انتقال در دو انبار تراکنش دارد)
    Task<PostedTransactionRef?> GetLastTransactionAsync(long docDetailId, int warehouseId, CancellationToken cancellationToken);
}
