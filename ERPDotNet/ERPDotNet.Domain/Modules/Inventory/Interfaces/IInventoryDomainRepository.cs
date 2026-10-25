using ERPDotNet.Domain.Modules.Inventory.Entities;

namespace ERPDotNet.Domain.Modules.Inventory.Interfaces;

public interface IInventoryDomainRepository
{
    // گرفتن موجودی لحظه‌ای
    Task<CurrentStock?> GetCurrentStockAsync(int warehouseId, int productId, int? locationId, int? batchId, CancellationToken cancellationToken);

    // گرفتن اطلاعات بچ
    Task<InventoryBatch?> GetBatchAsync(int batchId, CancellationToken cancellationToken);

    // برای پیدا کردن تراکنش اصلی جهت لینک کردن در زمان ابطال
    // آخرین تراکنش یک سطر سند در یک انبار (سطر انتقال در دو انبار تراکنش دارد)
    Task<long?> GetLastTransactionIdAsync(long docDetailId, int warehouseId, CancellationToken cancellationToken);

    // لوکیشن پیش‌فرض کالا در یک انبار (از تنظیمات کالا-انبار)، برای ورود کالا در مقصد انتقال
    Task<int?> GetDefaultLocationIdAsync(int productId, int warehouseId, CancellationToken cancellationToken);
}
