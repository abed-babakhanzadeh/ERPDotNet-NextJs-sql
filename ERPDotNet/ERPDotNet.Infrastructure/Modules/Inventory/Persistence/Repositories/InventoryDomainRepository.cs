using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Interfaces;
using ERPDotNet.Infrastructure.Persistence; // برای دسترسی به AppDbContext
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Repositories;

public class InventoryDomainRepository : IInventoryDomainRepository
{
    private readonly AppDbContext _context;

    public InventoryDomainRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<CurrentStock?> GetCurrentStockAsync(int warehouseId, int productId, int? locationId, int? batchId, CancellationToken cancellationToken)
    {
        // جستجوی دقیق موجودی لحظه‌ای
        // چون این جدول Snapshot است، کوئری بسیار سریع است
        return await _context.Set<CurrentStock>()
            .FirstOrDefaultAsync(x => 
                x.WarehouseId == warehouseId &&
                x.ProductId == productId &&
                x.LocationId == locationId &&
                x.BatchId == batchId, 
                cancellationToken);
    }

    public async Task<InventoryBatch?> GetBatchAsync(int batchId, CancellationToken cancellationToken)
    {
        return await _context.Set<InventoryBatch>()
            .FirstOrDefaultAsync(x => x.Id == batchId, cancellationToken);
    }

    public async Task<int?> GetDefaultLocationIdAsync(int productId, int warehouseId, CancellationToken cancellationToken)
    {
        return await _context.Set<ItemWarehouseSetting>()
            .Where(x => x.WarehouseId == warehouseId && x.InventoryItemProfile!.ProductId == productId)
            .Select(x => x.DefaultLocationId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<long?> GetLastTransactionIdAsync(long docDetailId, int warehouseId, CancellationToken cancellationToken)
    {
        // برای پیدا کردن تراکنش اصلی جهت ابطال
        // آخرین تراکنشی که برای این سطر سند در این انبار ثبت شده را می‌گیریم
        return await _context.Set<InventoryTransaction>()
            .Where(x => x.DocDetailId == docDetailId && x.WarehouseId == warehouseId)
            .OrderByDescending(x => x.Id) // آخرین رکورد
            .Select(x => (long?)x.Id) // بدون nullable، نبود تراکنش به‌جای null مقدار 0 برمی‌گرداند
            .FirstOrDefaultAsync(cancellationToken);
    }
}