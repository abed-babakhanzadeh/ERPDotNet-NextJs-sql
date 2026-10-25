using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using ERPDotNet.Domain.Modules.Inventory.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Models;
using ERPDotNet.Domain.Modules.Inventory.Services;

namespace ERPDotNet.Tests.Inventory;

public class InventoryPostingServiceTests
{
    private const int WarehouseId = 1;
    private const int ProductId = 100;

    private readonly FakeInventoryRepository _repo = new();
    private readonly FakePolicy _policy = new();
    private readonly InventoryPostingService _sut;

    public InventoryPostingServiceTests()
    {
        _sut = new InventoryPostingService(_repo);
    }

    [Fact]
    public async Task Receipt_creates_new_stock_with_received_quantity()
    {
        var context = Context(InventoryNature.Input, Line(1, 25));

        var result = await _sut.ProcessDocumentAsync(context, default);

        Assert.True(result.IsSuccess);
        var stock = Assert.Single(result.UpdatedStocks);
        Assert.Equal(25, stock.QuantityOnHand);
        var tx = Assert.Single(result.GeneratedTransactions);
        Assert.Equal(InventoryTransactionSign.Increase, tx.Sign);
        Assert.Equal(25, tx.Quantity);
    }

    [Fact]
    public async Task Issue_decreases_existing_stock()
    {
        _repo.Stocks.Add(Stock(100));
        var context = Context(InventoryNature.Output, Line(1, 10));

        var result = await _sut.ProcessDocumentAsync(context, default);

        Assert.True(result.IsSuccess);
        Assert.Equal(90, Assert.Single(result.UpdatedStocks).QuantityOnHand);
    }

    [Fact]
    public async Task Issue_more_than_on_hand_fails_when_negative_not_allowed()
    {
        _repo.Stocks.Add(Stock(5));
        var context = Context(InventoryNature.Output, Line(1, 10));

        var result = await _sut.ProcessDocumentAsync(context, default);

        Assert.False(result.IsSuccess);
        Assert.Single(result.Errors);
    }

    [Fact]
    public async Task Issue_without_any_stock_fails_when_negative_not_allowed()
    {
        var context = Context(InventoryNature.Output, Line(1, 1));

        var result = await _sut.ProcessDocumentAsync(context, default);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Issue_is_allowed_to_go_negative_when_policy_allows()
    {
        _policy.AllowNegative = true;
        _repo.Stocks.Add(Stock(5));
        var context = Context(InventoryNature.Output, Line(1, 10));

        var result = await _sut.ProcessDocumentAsync(context, default);

        Assert.True(result.IsSuccess);
        Assert.Equal(-5, Assert.Single(result.UpdatedStocks).QuantityOnHand);
    }

    [Fact]
    public async Task Duplicate_lines_on_same_stock_key_are_checked_cumulatively()
    {
        _repo.Stocks.Add(Stock(15));
        var context = Context(InventoryNature.Output, Line(1, 10), Line(2, 10));

        var result = await _sut.ProcessDocumentAsync(context, default);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Duplicate_receipt_lines_for_new_stock_share_one_stock_record()
    {
        var context = Context(InventoryNature.Input, Line(1, 10), Line(2, 5));

        var result = await _sut.ProcessDocumentAsync(context, default);

        Assert.True(result.IsSuccess);
        Assert.Equal(15, Assert.Single(result.UpdatedStocks).QuantityOnHand);
        Assert.Equal(2, result.GeneratedTransactions.Count);
    }

    [Fact]
    public async Task Blocked_batch_is_rejected()
    {
        _repo.Batches.Add(new InventoryBatch { Id = 7, ProductId = ProductId, BatchNumber = "B7", IsBlocked = true });
        var context = Context(InventoryNature.Input, Line(1, 10, batchId: 7));

        var result = await _sut.ProcessDocumentAsync(context, default);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Batch_of_another_product_is_rejected()
    {
        _repo.Batches.Add(new InventoryBatch { Id = 7, ProductId = ProductId + 1, BatchNumber = "B7" });
        var context = Context(InventoryNature.Input, Line(1, 10, batchId: 7));

        var result = await _sut.ProcessDocumentAsync(context, default);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, e => e.Contains("متعلق به کالای"));
    }

    [Fact]
    public async Task Receipt_with_own_batch_posts_stock_on_that_batch()
    {
        _repo.Batches.Add(new InventoryBatch { Id = 7, ProductId = ProductId, BatchNumber = "B7" });
        var context = Context(InventoryNature.Input, Line(1, 10, batchId: 7));

        var result = await _sut.ProcessDocumentAsync(context, default);

        Assert.True(result.IsSuccess);
        Assert.Equal(7, Assert.Single(result.UpdatedStocks).BatchId);
    }

    [Fact]
    public async Task Expired_batch_cannot_be_issued()
    {
        _policy.CheckExpiry = true;
        _repo.Batches.Add(new InventoryBatch { Id = 7, ProductId = ProductId, BatchNumber = "B7", ExpiryDate = new DateTime(2020, 1, 1) });
        _repo.Stocks.Add(Stock(100, batchId: 7));
        var context = Context(InventoryNature.Output, Line(1, 10, batchId: 7));

        var result = await _sut.ProcessDocumentAsync(context, default);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Reversal_of_receipt_decreases_stock_and_links_original_transaction()
    {
        _repo.Stocks.Add(Stock(25));
        _repo.LastTransactions[(1, WarehouseId)] = new(555, null);
        var context = Context(InventoryNature.Input, Line(1, 25));

        var result = await _sut.ReverseDocumentAsync(context, default);

        Assert.True(result.IsSuccess);
        Assert.Equal(0, Assert.Single(result.UpdatedStocks).QuantityOnHand);
        var tx = Assert.Single(result.GeneratedTransactions);
        Assert.Equal(InventoryTransactionSign.Decrease, tx.Sign);
        Assert.Equal(555, tx.RelatedTransactionId);
    }

    [Fact]
    public async Task Reversal_without_original_transaction_fails()
    {
        _repo.Stocks.Add(Stock(25));
        var context = Context(InventoryNature.Input, Line(1, 25));

        var result = await _sut.ReverseDocumentAsync(context, default);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Transfer_moves_stock_from_source_to_the_line_destination_location()
    {
        _repo.Stocks.Add(Stock(100));
        var context = Context(InventoryNature.Transfer, Line(1, 30));

        var result = await _sut.ProcessDocumentAsync(context, default);

        Assert.True(result.IsSuccess);
        Assert.Equal(70, result.UpdatedStocks.Single(s => s.WarehouseId == WarehouseId).QuantityOnHand);
        var destination = result.UpdatedStocks.Single(s => s.WarehouseId == DestinationId);
        Assert.Equal(30, destination.QuantityOnHand);
        Assert.Equal(DestinationLocation, destination.LocationId);
        Assert.Equal(2, result.GeneratedTransactions.Count);
        Assert.Contains(result.GeneratedTransactions, t => t.WarehouseId == WarehouseId && t.Sign == InventoryTransactionSign.Decrease);
        Assert.Contains(result.GeneratedTransactions, t => t.WarehouseId == DestinationId && t.Sign == InventoryTransactionSign.Increase);
    }

    [Fact]
    public async Task Transfer_more_than_source_on_hand_fails()
    {
        _repo.Stocks.Add(Stock(10));
        var context = Context(InventoryNature.Transfer, Line(1, 30));

        var result = await _sut.ProcessDocumentAsync(context, default);

        Assert.False(result.IsSuccess);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(WarehouseId)]
    public async Task Transfer_without_distinct_destination_fails(int? destinationId)
    {
        _repo.Stocks.Add(Stock(100));
        var context = Context(InventoryNature.Transfer, Line(1, 30));
        context.Header.DestinationWarehouseId = destinationId;

        var result = await _sut.ProcessDocumentAsync(context, default);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Transfer_reversal_returns_stock_to_source()
    {
        _repo.Stocks.Add(Stock(70));
        _repo.Stocks.Add(new CurrentStock { WarehouseId = DestinationId, ProductId = ProductId, LocationId = DestinationLocation, QuantityOnHand = 30 });
        _repo.LastTransactions[(1, WarehouseId)] = new(10, null);
        _repo.LastTransactions[(1, DestinationId)] = new(11, DestinationLocation);
        var context = Context(InventoryNature.Transfer, Line(1, 30));

        var result = await _sut.ReverseDocumentAsync(context, default);

        Assert.True(result.IsSuccess);
        Assert.Equal(100, result.UpdatedStocks.Single(s => s.WarehouseId == WarehouseId).QuantityOnHand);
        Assert.Equal(0, result.UpdatedStocks.Single(s => s.WarehouseId == DestinationId).QuantityOnHand);
        Assert.Contains(result.GeneratedTransactions, t => t.WarehouseId == WarehouseId && t.RelatedTransactionId == 10);
        Assert.Contains(result.GeneratedTransactions, t => t.WarehouseId == DestinationId && t.RelatedTransactionId == 11);
    }

    [Fact]
    public async Task Transfer_reversal_fails_when_destination_stock_was_consumed()
    {
        _repo.Stocks.Add(Stock(70));
        _repo.Stocks.Add(new CurrentStock { WarehouseId = DestinationId, ProductId = ProductId, LocationId = DestinationLocation, QuantityOnHand = 5 });
        _repo.LastTransactions[(1, WarehouseId)] = new(10, null);
        _repo.LastTransactions[(1, DestinationId)] = new(11, DestinationLocation);
        var context = Context(InventoryNature.Transfer, Line(1, 30));

        var result = await _sut.ReverseDocumentAsync(context, default);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Transfer_line_without_destination_location_fails()
    {
        _repo.Stocks.Add(Stock(100));
        var context = Context(InventoryNature.Transfer, Line(1, 30));
        context.Header.Details.Single().DestinationLocationId = null;

        var result = await _sut.ProcessDocumentAsync(context, default);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Reversal_uses_the_location_of_the_original_transaction()
    {
        // سند با نسخه قبلی ثبت شده و سطرش لوکیشن مقصد ندارد؛ تراکنش اصلی در لوکیشن 55 بوده
        _repo.Stocks.Add(Stock(70));
        _repo.Stocks.Add(new CurrentStock { WarehouseId = DestinationId, ProductId = ProductId, LocationId = 55, QuantityOnHand = 30 });
        _repo.LastTransactions[(1, WarehouseId)] = new(10, null);
        _repo.LastTransactions[(1, DestinationId)] = new(11, 55);
        var context = Context(InventoryNature.Transfer, Line(1, 30));
        context.Header.Details.Single().DestinationLocationId = null;

        var result = await _sut.ReverseDocumentAsync(context, default);

        Assert.True(result.IsSuccess);
        Assert.Equal(0, result.UpdatedStocks.Single(s => s.WarehouseId == DestinationId).QuantityOnHand);
        Assert.Equal(55, result.GeneratedTransactions.Single(t => t.WarehouseId == DestinationId).LocationId);
    }

    private const int DestinationId = 2;
    private const int DestinationLocation = 77;

    private InventoryPostingContext Context(InventoryNature nature, params InventoryDocDetail[] lines)
    {
        var docType = new InventoryDocType { Id = 1, Title = "test", Nature = nature };
        var header = new InventoryDocHeader
        {
            Id = 1,
            DocTypeId = docType.Id,
            WarehouseId = WarehouseId,
            DestinationWarehouseId = nature == InventoryNature.Transfer ? DestinationId : null,
            DocDate = new DateTime(2026, 1, 1),
            Details = lines.ToList()
        };
        return new InventoryPostingContext { Header = header, DocType = docType, Policy = _policy };
    }

    private static InventoryDocDetail Line(long id, decimal qty, int? batchId = null) =>
        new() { Id = id, ProductId = ProductId, MainUnitQuantity = qty, BatchId = batchId, DestinationLocationId = DestinationLocation };

    private static CurrentStock Stock(decimal onHand, int? batchId = null) =>
        new() { WarehouseId = WarehouseId, ProductId = ProductId, BatchId = batchId, QuantityOnHand = onHand };

    private sealed class FakePolicy : IInventoryPostingPolicy
    {
        public bool AllowNegative { get; set; }
        public bool CheckExpiry { get; set; }
        public bool CanGoNegative(InventoryDocType docType, int warehouseId) => AllowNegative;
        public bool ShouldCheckExpiry(InventoryDocType docType) => CheckExpiry;
        public bool ShouldCheckBatchBlockStatus(InventoryDocType docType) => true;
    }

    // Mimics EF identity resolution: the same stock key always returns the same instance.
    private sealed class FakeInventoryRepository : IInventoryDomainRepository
    {
        public List<CurrentStock> Stocks { get; } = new();
        public List<InventoryBatch> Batches { get; } = new();
        public Dictionary<(long DetailId, int WarehouseId), PostedTransactionRef> LastTransactions { get; } = new();

        public Task<CurrentStock?> GetCurrentStockAsync(int warehouseId, int productId, int? locationId, int? batchId, CancellationToken cancellationToken) =>
            Task.FromResult(Stocks.FirstOrDefault(s =>
                s.WarehouseId == warehouseId && s.ProductId == productId && s.LocationId == locationId && s.BatchId == batchId));

        public Task<InventoryBatch?> GetBatchAsync(int batchId, CancellationToken cancellationToken) =>
            Task.FromResult(Batches.FirstOrDefault(b => b.Id == batchId));

        public Task<PostedTransactionRef?> GetLastTransactionAsync(long docDetailId, int warehouseId, CancellationToken cancellationToken) =>
            Task.FromResult(LastTransactions.GetValueOrDefault((docDetailId, warehouseId)));
    }
}
