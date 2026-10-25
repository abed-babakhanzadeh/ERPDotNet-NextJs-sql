using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.BaseInfo.Services;
using ERPDotNet.Application.Modules.Inventory.ActionHandlers;
using ERPDotNet.Application.Modules.Inventory.Contracts;
using ERPDotNet.Application.Modules.Inventory.Commands.PostInventoryDoc;
using ERPDotNet.Application.Modules.Inventory.Commands.RevertInventoryDoc;
using ERPDotNet.Application.Modules.Workflow.Contracts;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using ERPDotNet.Domain.Modules.Inventory.Services;
using ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Repositories;
using ERPDotNet.Infrastructure.Modules.Inventory.Services;
using ERPDotNet.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ERPDotNet.Tests.Inventory;

// End-to-end posting through the real handlers on one DbContext, as in a single HTTP request scope.
public class InventoryPostingFlowTests : IDisposable
{
    private const int WarehouseId = 1;
    private const int ProductId = 100;
    private static readonly byte[] RowVersion = [1];

    private readonly string _dbName = Guid.NewGuid().ToString();
    private readonly AppDbContext _db;

    public InventoryPostingFlowTests()
    {
        _db = NewContext();
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Posting_an_issue_subtracts_quantity_once()
    {
        await SeedStock(100);
        var docId = await SeedDoc(InventoryNature.Output, InventoryDocStatus.Approved, 10);

        await PostHandler(_db).Handle(new PostInventoryDocCommand { Id = docId, RowVersion = Convert.ToBase64String(RowVersion) }, default);

        Assert.Equal(90, await OnHand());
    }

    [Fact]
    public async Task Posting_publishes_a_plain_data_notification()
    {
        await SeedStock(100);
        var docId = await SeedDoc(InventoryNature.Output, InventoryDocStatus.Approved, 10);

        await PostHandler(_db).Handle(new PostInventoryDocCommand { Id = docId, RowVersion = Convert.ToBase64String(RowVersion) }, default);

        var notification = Assert.IsType<InventoryDocPostedNotification>(Assert.Single(_publisher.Published));
        Assert.Equal(docId, notification.DocId);
        Assert.Equal(10, Assert.Single(notification.Lines).Quantity);
    }

    [Fact]
    public async Task Posting_into_a_closed_fiscal_year_is_rejected()
    {
        await SeedStock(100);
        var yearId = await SeedFiscalYear(FiscalYearStatus.Closed);
        var docId = await SeedDoc(InventoryNature.Output, InventoryDocStatus.Approved, 10, fiscalYearId: yearId);

        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            PostHandler(_db).Handle(new PostInventoryDocCommand { Id = docId, RowVersion = Convert.ToBase64String(RowVersion) }, default));
        Assert.Equal(100, await OnHand());
    }

    [Fact]
    public async Task Posting_a_receipt_adds_quantity_once()
    {
        await SeedStock(100);
        var docId = await SeedDoc(InventoryNature.Input, InventoryDocStatus.Approved, 10);

        await PostHandler(_db).Handle(new PostInventoryDocCommand { Id = docId, RowVersion = Convert.ToBase64String(RowVersion) }, default);

        Assert.Equal(110, await OnHand());
    }

    [Fact]
    public async Task Posting_a_receipt_for_new_stock_creates_one_record()
    {
        var docId = await SeedDoc(InventoryNature.Input, InventoryDocStatus.Approved, 10);

        await PostHandler(_db).Handle(new PostInventoryDocCommand { Id = docId, RowVersion = Convert.ToBase64String(RowVersion) }, default);

        using var verify = NewContext();
        var stock = await verify.CurrentStocks.SingleAsync();
        Assert.Equal(10, stock.QuantityOnHand);
    }

    [Fact]
    public async Task Workflow_post_action_subtracts_quantity_once()
    {
        await SeedStock(100);
        var docId = await SeedDoc(InventoryNature.Output, InventoryDocStatus.InProcess, 10);
        var handler = new PostInventoryDocActionHandler(_db, PostingService(_db), new DefaultInventoryPostingPolicy(),
            NullLogger<PostInventoryDocActionHandler>.Instance);

        await handler.ExecuteAsync(new BpmsActionContext { TargetRecordId = docId, UserId = "1" }, default);
        await _db.SaveChangesAsync();

        Assert.Equal(90, await OnHand());
    }

    [Fact]
    public async Task Reverting_a_posted_receipt_restores_previous_stock()
    {
        await SeedStock(100);
        var docId = await SeedDoc(InventoryNature.Input, InventoryDocStatus.Approved, 10);
        await PostHandler(_db).Handle(new PostInventoryDocCommand { Id = docId, RowVersion = Convert.ToBase64String(RowVersion) }, default);

        using var revertScope = NewContext();
        await RevertHandler(revertScope).Handle(new RevertInventoryDocCommand(docId), default);

        Assert.Equal(100, await OnHand());
        using var verify = NewContext();
        Assert.Equal(InventoryDocStatus.Cancelled, (await verify.InventoryDocHeaders.SingleAsync()).Status);
    }

    [Fact]
    public async Task Reverting_a_receipt_whose_stock_was_consumed_is_rejected()
    {
        var docId = await SeedDoc(InventoryNature.Input, InventoryDocStatus.Approved, 10);
        await PostHandler(_db).Handle(new PostInventoryDocCommand { Id = docId, RowVersion = Convert.ToBase64String(RowVersion) }, default);
        using (var consume = NewContext())
        {
            (await consume.CurrentStocks.SingleAsync()).QuantityOnHand = 3;
            await consume.SaveChangesAsync();
        }

        using var revertScope = NewContext();
        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            RevertHandler(revertScope).Handle(new RevertInventoryDocCommand(docId), default));
    }

    [Fact]
    public async Task Last_transaction_id_is_null_when_detail_was_never_posted()
    {
        var repo = new InventoryDomainRepository(_db);

        Assert.Null(await repo.GetLastTransactionAsync(12345, WarehouseId, default));
    }

    [Fact]
    public async Task Posting_and_reverting_a_transfer_moves_stock_between_warehouses()
    {
        await SeedStock(100);
        var docId = await SeedDoc(InventoryNature.Transfer, InventoryDocStatus.Approved, 30, DestinationId);

        await PostHandler(_db).Handle(new PostInventoryDocCommand { Id = docId, RowVersion = Convert.ToBase64String(RowVersion) }, default);

        using (var verify = NewContext())
        {
            var stocks = await verify.CurrentStocks.ToListAsync();
            Assert.Equal(70, stocks.Single(s => s.WarehouseId == WarehouseId).QuantityOnHand);
            var destination = stocks.Single(s => s.WarehouseId == DestinationId);
            Assert.Equal(30, destination.QuantityOnHand);
            Assert.Equal(77, destination.LocationId);
        }

        using var revertScope = NewContext();
        await RevertHandler(revertScope).Handle(new RevertInventoryDocCommand(docId), default);

        using var afterRevert = NewContext();
        var reverted = await afterRevert.CurrentStocks.ToListAsync();
        Assert.Equal(100, reverted.Single(s => s.WarehouseId == WarehouseId).QuantityOnHand);
        Assert.Equal(0, reverted.Single(s => s.WarehouseId == DestinationId).QuantityOnHand);
    }

    private const int DestinationId = 2;

    private AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(_dbName).Options);

    private static InventoryPostingService PostingService(AppDbContext db) => new(new InventoryDomainRepository(db));

    private readonly RecordingPublisher _publisher = new();

    private PostInventoryDocHandler PostHandler(AppDbContext db) =>
        new(db, PostingService(db), new DefaultInventoryPostingPolicy(), new FakeCurrentUser(), new NoopCache(), _publisher, new FiscalYearService(db));

    private static RevertInventoryDocHandler RevertHandler(AppDbContext db) =>
        new(db, PostingService(db), new DefaultInventoryPostingPolicy(), new FiscalYearService(db));

    private async Task SeedStock(decimal onHand)
    {
        using var seed = NewContext();
        seed.CurrentStocks.Add(new CurrentStock { WarehouseId = WarehouseId, ProductId = ProductId, QuantityOnHand = onHand, RowVersion = RowVersion });
        await seed.SaveChangesAsync();
    }

    private async Task<long> SeedDoc(InventoryNature nature, InventoryDocStatus status, decimal qty, int? destinationWarehouseId = null, int? fiscalYearId = null)
    {
        using var seed = NewContext();
        var docType = new InventoryDocType { Title = nature.ToString(), Nature = nature, RowVersion = RowVersion };
        seed.InventoryDocTypes.Add(docType);
        await seed.SaveChangesAsync();

        var doc = new InventoryDocHeader
        {
            DocTypeId = docType.Id,
            WarehouseId = WarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            FiscalYearId = fiscalYearId,
            Status = status,
            RowVersion = RowVersion,
            Details =
            {
                new InventoryDocDetail
                {
                    ProductId = ProductId, MainUnitQuantity = qty, RowVersion = RowVersion,
                    DestinationLocationId = destinationWarehouseId.HasValue ? 77 : null
                }
            }
        };
        seed.InventoryDocHeaders.Add(doc);
        await seed.SaveChangesAsync();
        return doc.Id;
    }

    private async Task<int> SeedFiscalYear(FiscalYearStatus status)
    {
        using var seed = NewContext();
        var year = new FiscalYear
        {
            CompanyId = 1, Title = "1405", StartDate = new DateTime(2026, 3, 21), EndDate = new DateTime(2027, 3, 20),
            Status = status, RowVersion = RowVersion
        };
        seed.FiscalYears.Add(year);
        await seed.SaveChangesAsync();
        return year.Id;
    }

    private async Task<decimal> OnHand()
    {
        using var verify = NewContext();
        return (await verify.CurrentStocks.SingleAsync()).QuantityOnHand;
    }

    private sealed class FakeCurrentUser : ICurrentUserService
    {
        public string? UserId => "1";
        public string? CompanyId => "1";
    }

    private sealed class NoopCache : ICacheService
    {
        public Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default) => Task.FromResult(default(T));
        public Task SetAsync<T>(string key, T value, TimeSpan? slidingExpiration = null, List<string>? tags = null, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task RemoveAsync(string key, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task RemoveByTagAsync(string tag, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    // مثل MediatR واقعی، انتشار شیئی که INotification نیست را رد می‌کند
    private sealed class RecordingPublisher : IPublisher
    {
        public List<object> Published { get; } = new();

        public Task Publish(object notification, CancellationToken cancellationToken = default)
        {
            if (notification is not INotification)
                throw new ArgumentException("notification must implement INotification");
            Published.Add(notification);
            return Task.CompletedTask;
        }

        public Task Publish<TNotification>(TNotification notification, CancellationToken cancellationToken = default)
            where TNotification : INotification => Publish((object)notification!, cancellationToken);
    }
}
