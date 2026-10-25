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
        _repo.LastTransactionIds[1] = 555;
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

    private InventoryPostingContext Context(InventoryNature nature, params InventoryDocDetail[] lines)
    {
        var docType = new InventoryDocType { Id = 1, Title = "test", Nature = nature };
        var header = new InventoryDocHeader
        {
            Id = 1,
            DocTypeId = docType.Id,
            WarehouseId = WarehouseId,
            DocDate = new DateTime(2026, 1, 1),
            Details = lines.ToList()
        };
        return new InventoryPostingContext { Header = header, DocType = docType, Policy = _policy };
    }

    private static InventoryDocDetail Line(long id, decimal qty, int? batchId = null) =>
        new() { Id = id, ProductId = ProductId, MainUnitQuantity = qty, BatchId = batchId };

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
        public Dictionary<long, long> LastTransactionIds { get; } = new();

        public Task<CurrentStock?> GetCurrentStockAsync(int warehouseId, int productId, int? locationId, int? batchId, CancellationToken cancellationToken) =>
            Task.FromResult(Stocks.FirstOrDefault(s =>
                s.WarehouseId == warehouseId && s.ProductId == productId && s.LocationId == locationId && s.BatchId == batchId));

        public Task<InventoryBatch?> GetBatchAsync(int batchId, CancellationToken cancellationToken) =>
            Task.FromResult(Batches.FirstOrDefault(b => b.Id == batchId));

        public Task<long?> GetLastTransactionIdAsync(long docDetailId, CancellationToken cancellationToken) =>
            Task.FromResult(LastTransactionIds.TryGetValue(docDetailId, out var id) ? id : (long?)null);
    }
}
