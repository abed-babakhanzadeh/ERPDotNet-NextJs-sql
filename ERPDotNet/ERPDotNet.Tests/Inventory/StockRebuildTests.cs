using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.Commands.RebuildCurrentStock;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using ERPDotNet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ERPDotNet.Tests.Inventory;

public class StockRebuildTests : IDisposable
{
    private readonly string _dbName = Guid.NewGuid().ToString();
    private readonly AppDbContext _db;

    public StockRebuildTests()
    {
        _db = NewContext();
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Preview_lists_only_rows_that_differ_from_transactions_and_changes_nothing()
    {
        // کالا 100: +100 -10 = 90 ولی Snapshot (به‌خاطر باگ دوبرابر شدن) 180 است
        AddTx(1, 100, Increase, 100);
        AddTx(1, 100, Decrease, 10);
        AddStock(1, 100, 180);
        // کالا 200: درست است
        AddTx(1, 200, Increase, 5);
        AddStock(1, 200, 5);
        await _db.SaveChangesAsync();

        var rows = await new PreviewStockRebuildHandler(NewContext()).Handle(new PreviewStockRebuildQuery(), default);

        var row = Assert.Single(rows);
        Assert.Equal(100, row.ProductId);
        Assert.Equal(180, row.CurrentQuantity);
        Assert.Equal(90, row.ExpectedQuantity);
        Assert.Equal(-90, row.Difference);
        Assert.Equal(180, await OnHand(1, 100));
    }

    [Fact]
    public async Task Rebuild_sets_snapshot_to_transaction_totals_and_keeps_reservations()
    {
        AddTx(1, 100, Increase, 100);
        AddTx(1, 100, Decrease, 10);
        _db.CurrentStocks.Add(new CurrentStock { WarehouseId = 1, ProductId = 100, QuantityOnHand = 180, QuantityReserved = 7, RowVersion = [1] });
        await _db.SaveChangesAsync();

        var result = await Rebuild();

        Assert.Equal(1, result.Updated);
        using var verify = NewContext();
        var stock = await verify.CurrentStocks.SingleAsync();
        Assert.Equal(90, stock.QuantityOnHand);
        Assert.Equal(7, stock.QuantityReserved);
    }

    [Fact]
    public async Task Rebuild_creates_missing_rows_and_zeroes_rows_without_transactions()
    {
        // انتقال‌های قبلی که هیچ رکورد موجودی در مقصد نساخته بودند
        AddTx(2, 100, Increase, 30);
        // رکوردی که هیچ تراکنشی پشتش نیست
        AddStock(3, 100, 12);
        await _db.SaveChangesAsync();

        var result = await Rebuild();

        Assert.Equal(1, result.Created);
        Assert.Equal(1, result.Zeroed);
        Assert.Equal(30, await OnHand(2, 100));
        Assert.Equal(0, await OnHand(3, 100));
    }

    [Fact]
    public async Task Rebuild_separates_locations_and_batches()
    {
        AddTx(1, 100, Increase, 10, locationId: 5);
        AddTx(1, 100, Increase, 4, batchId: 9);
        await _db.SaveChangesAsync();

        await Rebuild();

        using var verify = NewContext();
        var stocks = await verify.CurrentStocks.ToListAsync();
        Assert.Equal(10, stocks.Single(s => s.LocationId == 5).QuantityOnHand);
        Assert.Equal(4, stocks.Single(s => s.BatchId == 9).QuantityOnHand);
    }

    [Fact]
    public async Task Rebuild_is_idempotent()
    {
        AddTx(1, 100, Increase, 10);
        AddStock(1, 100, 20);
        await _db.SaveChangesAsync();

        await Rebuild();
        var second = await Rebuild();

        Assert.Equal(0, second.Updated + second.Created + second.Zeroed);
    }

    private const InventoryTransactionSign Increase = InventoryTransactionSign.Increase;
    private const InventoryTransactionSign Decrease = InventoryTransactionSign.Decrease;
    private long _detailId;

    private void AddTx(int warehouseId, int productId, InventoryTransactionSign sign, decimal qty, int? locationId = null, int? batchId = null) =>
        _db.InventoryTransactions.Add(new InventoryTransaction
        {
            DocHeaderId = 1, DocDetailId = ++_detailId, DocTypeId = 1,
            WarehouseId = warehouseId, ProductId = productId, LocationId = locationId, BatchId = batchId,
            Sign = sign, Quantity = qty, RowVersion = [1]
        });

    private void AddStock(int warehouseId, int productId, decimal onHand) =>
        _db.CurrentStocks.Add(new CurrentStock { WarehouseId = warehouseId, ProductId = productId, QuantityOnHand = onHand, RowVersion = [1] });

    private Task<StockRebuildResultDto> Rebuild() =>
        new RebuildCurrentStockHandler(NewContext(), new NoopCache(), NullLogger<RebuildCurrentStockHandler>.Instance)
            .Handle(new RebuildCurrentStockCommand(), default);

    private async Task<decimal> OnHand(int warehouseId, int productId)
    {
        using var verify = NewContext();
        return (await verify.CurrentStocks.SingleAsync(s => s.WarehouseId == warehouseId && s.ProductId == productId)).QuantityOnHand;
    }

    private AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(_dbName).Options);

    private sealed class NoopCache : ICacheService
    {
        public Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default) => Task.FromResult(default(T));
        public Task SetAsync<T>(string key, T value, TimeSpan? slidingExpiration = null, List<string>? tags = null, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task RemoveAsync(string key, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task RemoveByTagAsync(string tag, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
}
