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

    public async Task<bool> IsBatchManagedAsync(int productId, CancellationToken cancellationToken)
    {
        return await _context.Set<InventoryItemProfile>()
            .AnyAsync(x => x.ProductId == productId && x.IsBatchManaged && !x.IsDeleted, cancellationToken);
    }

    public async Task<PostedTransactionRef?> GetLastTransactionAsync(long docDetailId, int warehouseId, CancellationToken cancellationToken)
    {
        // برای پیدا کردن تراکنش اصلی جهت ابطال
        // آخرین تراکنشی که برای این سطر سند در این انبار ثبت شده را می‌گیریم
        return await _context.Set<InventoryTransaction>()
            .Where(x => x.DocDetailId == docDetailId && x.WarehouseId == warehouseId)
            .OrderByDescending(x => x.Id) // آخرین رکورد
            .Select(x => new PostedTransactionRef(x.Id, x.LocationId))
            .FirstOrDefaultAsync(cancellationToken);
    }
}