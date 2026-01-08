using ERPDotNet.Domain.Modules.Inventory.Entities;

namespace ERPDotNet.Domain.Modules.Inventory.Interfaces;

public interface IInventoryDomainRepository
{
    // گرفتن موجودی لحظه‌ای
    Task<CurrentStock?> GetCurrentStockAsync(int warehouseId, int productId, int? locationId, int? batchId, CancellationToken cancellationToken);
    
    // گرفتن اطلاعات بچ
    Task<InventoryBatch?> GetBatchAsync(int batchId, CancellationToken cancellationToken);

    // === جدید: برای پیدا کردن تراکنش اصلی جهت لینک کردن در زمان ابطال ===
    // این متد آخرین تراکنش موفق مربوط به یک سطر سند را برمی‌گرداند
    Task<long?> GetLastTransactionIdAsync(long docDetailId, CancellationToken cancellationToken);
}