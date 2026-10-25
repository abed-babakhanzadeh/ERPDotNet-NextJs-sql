using System.Runtime.CompilerServices;
using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Modules.Inventory.Commands.CreateInventoryDoc;
using ERPDotNet.Application.Modules.Inventory.Commands.StockCounts;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using ERPDotNet.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace ERPDotNet.Tests.Inventory;

public class StockCountTests : IDisposable
{
    private const int WarehouseId = 1;
    private const int LocationId = 10;
    private static readonly byte[] RowVersion = [1];

    private readonly AppDbContext _db = new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
        .Options);
    private readonly RecordingSender _sender = new();

    public void Dispose() => _db.Dispose();

    [Fact]
    public void Adjustment_is_counted_minus_system_quantity_and_zero_differences_are_dropped()
    {
        var a = new StockCountRules.StockKey(1, LocationId, null);
        var b = new StockCountRules.StockKey(2, LocationId, 5);
        var c = new StockCountRules.StockKey(3, LocationId, null);

        var result = StockCountRules.ComputeAdjustments([(a, 10, 12), (b, 4, 1), (c, 7, 7)]);

        Assert.Equal([(1, 2m), (2, -3m)], result.Select(r => (r.ProductId, r.Quantity)));
    }

    [Fact]
    public async Task Starting_a_count_snapshots_nonzero_stock_of_the_warehouse()
    {
        await SeedStock(productId: 1, onHand: 10);
        await SeedStock(productId: 2, onHand: 0);
        await SeedStock(productId: 3, onHand: 5, warehouseId: 2);

        var id = await new CreateStockCountHandler(_db).Handle(new CreateStockCountCommand { WarehouseId = WarehouseId }, default);

        var line = Assert.Single((await _db.StockCounts.Include(x => x.Lines).SingleAsync(x => x.Id == id)).Lines);
        Assert.Equal((1, 10m, (decimal?)null), (line.ProductId, line.SystemQuantity, line.CountedQuantity));
    }

    [Fact]
    public async Task Finalizing_creates_docs_for_the_difference_with_the_quantity_at_count_start()
    {
        await SeedStock(productId: 1, onHand: 10);
        await SeedStock(productId: 2, onHand: 8);
        var id = await new CreateStockCountHandler(_db).Handle(new CreateStockCountCommand { WarehouseId = WarehouseId }, default);
        var (input, output) = await SeedDocTypes();
        await Count(id, (1, 13), (2, 6));
        // حواله‌ای که بعد از شروع قطعی شده اختلاف را عوض نمی‌کند
        (await _db.CurrentStocks.SingleAsync(s => s.ProductId == 2)).QuantityOnHand = 5;
        await _db.SaveChangesAsync();

        await Finalize(id, input, output);

        Assert.Collection(_sender.Docs,
            surplus => Assert.Equal((input, 1, 3m), (surplus.DocTypeId, surplus.Details.Single().ProductId, surplus.Details.Single().MainUnitQuantity)),
            shortage => Assert.Equal((output, 2, 2m), (shortage.DocTypeId, shortage.Details.Single().ProductId, shortage.Details.Single().MainUnitQuantity)));
        var count = await _db.StockCounts.SingleAsync();
        Assert.Equal(StockCountStatus.Finalized, count.Status);
        Assert.NotNull(count.SurplusDocId);
        Assert.NotNull(count.ShortageDocId);
    }

    [Fact]
    public async Task Finalizing_is_rejected_while_a_line_is_uncounted_or_types_mismatch()
    {
        await SeedStock(productId: 1, onHand: 10);
        await SeedStock(productId: 2, onHand: 3);
        var id = await new CreateStockCountHandler(_db).Handle(new CreateStockCountCommand { WarehouseId = WarehouseId }, default);
        var (input, output) = await SeedDocTypes();

        await Count(id, (1, 9));
        var uncounted = await Assert.ThrowsAsync<BusinessRuleException>(() => Finalize(id, input, output));
        Assert.Contains("شمرده نشده", uncounted.Message);

        await Count(id, (1, 9), (2, 3));
        var wrongType = await Assert.ThrowsAsync<BusinessRuleException>(() => Finalize(id, input, input));
        Assert.Contains("صادره", wrongType.Message);
        Assert.Empty(_sender.Docs);
    }

    [Fact]
    public async Task Serial_managed_difference_is_rejected()
    {
        await SeedStock(productId: 1, onHand: 2);
        _db.Products.Add(new Product { Id = 1, Code = "SER-1", Name = "دستگاه", UnitId = 1, SupplyType = ProductSupplyType.Purchased, RowVersion = RowVersion });
        _db.InventoryItemProfiles.Add(new InventoryItemProfile { ProductId = 1, IsSerialManaged = true, MainInventoryUnitId = 1, RowVersion = RowVersion });
        await _db.SaveChangesAsync();
        var id = await new CreateStockCountHandler(_db).Handle(new CreateStockCountCommand { WarehouseId = WarehouseId }, default);
        var (input, output) = await SeedDocTypes();
        await Count(id, (1, 1));

        var ex = await Assert.ThrowsAsync<BusinessRuleException>(() => Finalize(id, input, output));
        Assert.Contains("SER-1", ex.Message);
    }

    [Fact]
    public async Task Found_product_can_be_added_but_not_twice_and_system_lines_are_not_removed()
    {
        await SeedStock(productId: 1, onHand: 10);
        var id = await new CreateStockCountHandler(_db).Handle(new CreateStockCountCommand { WarehouseId = WarehouseId }, default);
        _db.Locations.Add(new Location { Id = LocationId, WarehouseId = WarehouseId, Code = "L1", Title = "L1", RowVersion = RowVersion });
        await _db.SaveChangesAsync();
        var handler = new UpdateStockCountHandler(_db);

        // سطر سیستمی در درخواست نیامده؛ نباید حذف شود
        await handler.Handle(new UpdateStockCountCommand
        {
            Id = id,
            Lines = [new StockCountLineInput { ProductId = 9, LocationId = LocationId, CountedQuantity = 4 }]
        }, default);
        var lines = (await _db.StockCounts.Include(x => x.Lines).SingleAsync()).Lines;
        Assert.Equal([1, 9], lines.Select(l => l.ProductId).Order());

        var existing = lines.Single(l => l.ProductId == 9).Id;
        await Assert.ThrowsAsync<BusinessRuleException>(() => handler.Handle(new UpdateStockCountCommand
        {
            Id = id,
            Lines =
            [
                new StockCountLineInput { Id = existing, ProductId = 9, LocationId = LocationId, CountedQuantity = 4 },
                new StockCountLineInput { ProductId = 9, LocationId = LocationId, CountedQuantity = 1 }
            ]
        }, default));
    }

    private Task<FinalizeStockCountResult> Finalize(int id, int surplusType, int shortageType) =>
        new FinalizeStockCountHandler(_db, _sender).Handle(
            new FinalizeStockCountCommand { Id = id, SurplusDocTypeId = surplusType, ShortageDocTypeId = shortageType }, default);

    private async Task Count(int id, params (int ProductId, decimal Qty)[] counted)
    {
        var lines = await _db.StockCountLines.Where(l => l.StockCountId == id).ToListAsync();
        foreach (var (productId, qty) in counted)
            lines.Single(l => l.ProductId == productId).CountedQuantity = qty;
        await _db.SaveChangesAsync();
    }

    private async Task SeedStock(int productId, decimal onHand, int warehouseId = WarehouseId)
    {
        _db.CurrentStocks.Add(new CurrentStock
        {
            WarehouseId = warehouseId, ProductId = productId, LocationId = LocationId, QuantityOnHand = onHand, RowVersion = RowVersion
        });
        await _db.SaveChangesAsync();
    }

    private async Task<(int Input, int Output)> SeedDocTypes()
    {
        var input = new InventoryDocType { Title = "اضافی", Nature = InventoryNature.Input, RowVersion = RowVersion };
        var output = new InventoryDocType { Title = "کسری", Nature = InventoryNature.Output, RowVersion = RowVersion };
        _db.InventoryDocTypes.AddRange(input, output);
        await _db.SaveChangesAsync();
        return (input.Id, output.Id);
    }

    // سند واقعی را CreateInventoryDocHandler می‌سازد؛ اینجا فقط فرمان ارسالی بررسی می‌شود
    private sealed class RecordingSender : ISender
    {
        public List<CreateInventoryDocCommand> Docs { get; } = new();

        public Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken cancellationToken = default)
        {
            Docs.Add((CreateInventoryDocCommand)(object)request);
            return Task.FromResult((TResponse)(object)(long)(1000 + Docs.Count));
        }

        public Task Send<TRequest>(TRequest request, CancellationToken cancellationToken = default) where TRequest : IRequest =>
            throw new NotSupportedException();

        public Task<object?> Send(object request, CancellationToken cancellationToken = default) => throw new NotSupportedException();

        public IAsyncEnumerable<TResponse> CreateStream<TResponse>(IStreamRequest<TResponse> request, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public IAsyncEnumerable<object?> CreateStream(object request, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();
    }
}
