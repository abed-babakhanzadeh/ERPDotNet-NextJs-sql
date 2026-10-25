using ERPDotNet.Application.Modules.Inventory.Queries.GetFefoAllocation;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Tests.Inventory;

public class FefoAllocationTests : IDisposable
{
    private const int ProductId = 100;
    private const int WarehouseId = 1;
    private static readonly byte[] RowVersion = [1];
    private static readonly DateTime Today = new(2026, 10, 25);

    private readonly AppDbContext _db =
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Earliest_expiry_is_taken_first_and_split_across_batches()
    {
        var late = await SeedBatch("B-LATE", Today.AddDays(90), onHand: 50);
        var early = await SeedBatch("B-EARLY", Today.AddDays(10), onHand: 8);

        var result = await Handle(20);

        Assert.Equal([early, late], result.Lines.Select(l => l.BatchId));
        Assert.Equal([8m, 12m], result.Lines.Select(l => l.Quantity));
        Assert.Equal(0, result.Shortage);
    }

    [Fact]
    public async Task Blocked_unreleased_and_expired_batches_are_skipped_and_shortage_reported()
    {
        await SeedBatch("B-EXPIRED", Today.AddDays(-1), onHand: 100);
        await SeedBatch("B-BLOCKED", Today.AddDays(5), onHand: 100, blocked: true);
        await SeedBatch("B-QUARANTINE", Today.AddDays(6), onHand: 100, qc: BatchQcStatus.Quarantine);
        var ok = await SeedBatch("B-OK", Today.AddDays(30), onHand: 5);

        var result = await Handle(9);

        Assert.Equal(ok, Assert.Single(result.Lines).BatchId);
        Assert.Equal(4, result.Shortage);
    }

    [Fact]
    public async Task Batch_without_expiry_comes_last_and_reserved_quantity_is_not_offered()
    {
        var noExpiry = await SeedBatch("B-NONE", null, onHand: 10);
        var dated = await SeedBatch("B-DATED", Today.AddDays(200), onHand: 10, reserved: 7);

        var result = await Handle(6);

        Assert.Equal([dated, noExpiry], result.Lines.Select(l => l.BatchId));
        Assert.Equal([3m, 3m], result.Lines.Select(l => l.Quantity));
    }

    private Task<FefoAllocationDto> Handle(decimal qty) =>
        new GetFefoAllocationHandler(_db).Handle(new GetFefoAllocationQuery(ProductId, WarehouseId, qty, Today), default);

    private async Task<int> SeedBatch(string number, DateTime? expiry, decimal onHand, bool blocked = false, decimal reserved = 0, BatchQcStatus qc = BatchQcStatus.Released)
    {
        var batch = new InventoryBatch { ProductId = ProductId, BatchNumber = number, ExpiryDate = expiry, IsBlocked = blocked, QcStatus = qc, RowVersion = RowVersion };
        _db.InventoryBatches.Add(batch);
        await _db.SaveChangesAsync();
        _db.CurrentStocks.Add(new CurrentStock
        {
            WarehouseId = WarehouseId, ProductId = ProductId, BatchId = batch.Id,
            QuantityOnHand = onHand, QuantityReserved = reserved, RowVersion = RowVersion
        });
        await _db.SaveChangesAsync();
        return batch.Id;
    }
}
