using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Modules.Inventory.Commands.ValuationSettings;
using ERPDotNet.Application.Modules.Inventory.Contracts;
using ERPDotNet.Application.Modules.Inventory.Services;
using ERPDotNet.Application.Modules.Production.Services;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using ERPDotNet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Tests.Inventory;

// ارزش‌گذاری میانگین موزون متحرک، تنظیمات و بهای رسید تولید
public class InventoryValuationTests : IDisposable
{
    private const int Product = 100, Main = 1, Branch = 2, OtherCompany = 3;
    private static readonly byte[] RowVersion = [1];

    private readonly AppDbContext _db =
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private readonly InventoryDocType _receipt, _issue, _transfer, _freeReceipt;
    private long _nextDetail = 1, _nextTransaction = 1;

    public InventoryValuationTests()
    {
        _db.Warehouses.AddRange(
            new Warehouse { Id = Main, Title = "اصلی", Code = "W1", CompanyId = 1, RowVersion = RowVersion },
            new Warehouse { Id = Branch, Title = "شعبه", Code = "W2", CompanyId = 1, RowVersion = RowVersion },
            new Warehouse { Id = OtherCompany, Title = "شرکت دیگر", Code = "W3", CompanyId = 2, RowVersion = RowVersion });
        _receipt = new InventoryDocType { Title = "رسید خرید", Nature = InventoryNature.Input, AffectsCost = true, RowVersion = RowVersion };
        _freeReceipt = new InventoryDocType { Title = "رسید غیرریالی", Nature = InventoryNature.Input, AffectsCost = false, RowVersion = RowVersion };
        _issue = new InventoryDocType { Title = "حواله", Nature = InventoryNature.Output, RowVersion = RowVersion };
        _transfer = new InventoryDocType { Title = "انتقال", Nature = InventoryNature.Transfer, RowVersion = RowVersion };
        _db.InventoryDocTypes.AddRange(_receipt, _freeReceipt, _issue, _transfer);
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Moving_average_values_issues_at_the_current_average_and_clears_the_last_unit()
    {
        await Receive(Main, 10, 5);
        await Receive(Main, 10, 7); // میانگین ۶
        var issue = await Issue(Main, 4);
        Assert.Equal((6m, 24m), (issue.UnitCost, issue.TotalCost));

        var last = await Issue(Main, 16);
        Assert.Equal(96m, last.TotalCost);
        var balance = await _db.InventoryCostBalances.SingleAsync();
        Assert.Equal((0m, 0m), (balance.Quantity, balance.Value));
    }

    [Fact]
    public async Task Rounding_residue_leaves_with_the_last_unit()
    {
        await Receive(Main, 3, 10);
        _ = await Issue(Main, 1);
        var balanceAfterFirst = await _db.InventoryCostBalances.SingleAsync();
        balanceAfterFirst.Value = 20.0001m; // باقی‌مانده گرد کردن
        await _db.SaveChangesAsync();
        var last = await Issue(Main, 2);

        Assert.Equal(20.0001m, last.TotalCost);
        Assert.Equal(0m, (await _db.InventoryCostBalances.SingleAsync()).Value);
    }

    [Fact]
    public async Task Costed_receipt_without_unit_cost_is_rejected_but_uncosted_type_uses_the_average()
    {
        await Receive(Main, 10, 8);

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => Receive(Main, 5, null));
        Assert.Contains("بهای واحد را وارد کنید", error.Message);

        var free = await Receive(Main, 5, null, _freeReceipt);
        Assert.Equal(8m, free.UnitCost);
    }

    [Fact]
    public async Task Reversal_returns_exactly_the_original_cost()
    {
        await Receive(Main, 10, 5);
        var second = await Receive(Main, 10, 9); // میانگین ۷
        await Valuate(_receipt, second.DocDetailId, Main, InventoryTransactionSign.Decrease, 10, isReversal: true, relatedId: second.Id);

        var balance = await _db.InventoryCostBalances.SingleAsync();
        Assert.Equal((10m, 50m), (balance.Quantity, balance.Value));
    }

    [Fact]
    public async Task Company_level_transfer_keeps_the_average_and_companies_never_share_it()
    {
        await Receive(Main, 10, 5);
        await Receive(OtherCompany, 10, 50);

        var (outOf, into) = await Transfer(Main, Branch, 4);
        Assert.Equal((5m, 5m), (outOf.UnitCost, into.UnitCost));

        var balances = await _db.InventoryCostBalances.OrderBy(b => b.CompanyId).ToListAsync();
        Assert.Equal([(1, 10m, 50m), (2, 10m, 500m)], balances.Select(b => (b.CompanyId!.Value, b.Quantity, b.Value)));
    }

    [Fact]
    public async Task Warehouse_level_keeps_one_average_per_warehouse_and_transfer_moves_value()
    {
        await SetLevel(ValuationLevel.Warehouse);
        await Receive(Main, 10, 5);
        await Receive(Branch, 10, 9);

        var (_, into) = await Transfer(Main, Branch, 10);
        Assert.Equal(5m, into.UnitCost);

        var branch = await _db.InventoryCostBalances.SingleAsync(b => b.WarehouseId == Branch);
        Assert.Equal((20m, 140m, 7m), (branch.Quantity, branch.Value, branch.AverageCost));
        Assert.Equal(0m, (await _db.InventoryCostBalances.SingleAsync(b => b.WarehouseId == Main)).Value);
    }

    [Fact]
    public async Task Method_and_level_lock_after_the_first_valued_transaction_but_cost_basis_does_not()
    {
        var handler = new ValuationSettingsHandler(_db);
        await handler.Handle(new UpdateValuationSettingsCommand { Method = ValuationMethod.MovingAverage, Level = ValuationLevel.Warehouse, ProductionCostBasis = ProductionCostBasis.MaterialsOnly }, default);
        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            handler.Handle(new UpdateValuationSettingsCommand { Method = ValuationMethod.Fifo, Level = ValuationLevel.Warehouse, ProductionCostBasis = ProductionCostBasis.MaterialsOnly }, default));

        await Receive(Main, 1, 1);

        var settings = await handler.Handle(new GetValuationSettingsQuery(), default);
        Assert.True(settings.IsLocked);
        Assert.Contains(settings.Methods, m => m.Value == (int)ValuationMethod.Fifo && !m.Implemented);
        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            handler.Handle(new UpdateValuationSettingsCommand { Method = ValuationMethod.MovingAverage, Level = ValuationLevel.Company, ProductionCostBasis = ProductionCostBasis.MaterialsOnly }, default));
    }

    [Fact]
    public async Task Production_receipts_carry_the_posted_material_cost_and_returns_their_issue_cost()
    {
        var reader = new FakeReferenceReader
        {
            Lines =
            {
                // دو حواله آرد: ۱۰ واحد به ارزش ۱۲۰ و ۵ واحد به ارزش ۸۰؛ برگشت ۲ واحد به ارزش ۱۰
                new(1, InventoryNature.Output, 7, ProductionProgress.MaterialRole, -10, -120),
                new(2, InventoryNature.Output, 7, ProductionProgress.MaterialRole, -5, -80),
                new(3, InventoryNature.Input, 7, null, 2, 10),
                // رسید قبلی سفارش ۶۰ از بهای مواد را برده است
                new(4, InventoryNature.Input, 9, ProductionProgress.OutputRole, 3, 60),
            }
        };
        var provider = new ProductionReceiptCostProvider(reader);

        var costs = await provider.GetUnitCostsAsync(new ReceiptCostRequest(99, 1,
        [
            new(11, 9, 4, ProductionProgress.OutputRole),
            new(12, 9, 1, ProductionProgress.ScrapRole),
            new(13, 7, 1, null),
        ]), default);

        // (۱۲۰ + ۸۰ − ۱۰ − ۶۰) ÷ (۴ + ۱) = ۲۶
        Assert.Equal(26m, costs[11]);
        Assert.Equal(26m, costs[12]);
        // برگشت آرد: ۲۰۰ ÷ ۱۵
        Assert.Equal(13.333333m, costs[13]);
    }

    // === کمکی‌ها: هر فراخوانی یک سند یک‌سطری را مثل قطعی‌سازی ارزش‌گذاری و ذخیره می‌کند ===

    private Task<InventoryTransaction> Receive(int warehouseId, decimal quantity, decimal? unitCost, InventoryDocType? type = null) =>
        Valuate(type ?? _receipt, null, warehouseId, InventoryTransactionSign.Increase, quantity, unitCost: unitCost);

    private Task<InventoryTransaction> Issue(int warehouseId, decimal quantity) =>
        Valuate(_issue, null, warehouseId, InventoryTransactionSign.Decrease, quantity);

    private async Task<(InventoryTransaction Out, InventoryTransaction In)> Transfer(int from, int to, decimal quantity)
    {
        var detail = _nextDetail++;
        var doc = Doc(_transfer, from, detail, quantity, null);
        var transactions = new List<InventoryTransaction>
        {
            Tx(doc, detail, from, InventoryTransactionSign.Decrease, quantity),
            Tx(doc, detail, to, InventoryTransactionSign.Increase, quantity),
        };
        await new InventoryValuationService(_db, []).ApplyAsync(doc, _transfer, transactions, isReversal: false, default);
        _db.InventoryTransactions.AddRange(transactions);
        await _db.SaveChangesAsync();
        return (transactions[0], transactions[1]);
    }

    private async Task<InventoryTransaction> Valuate(InventoryDocType type, long? detailId, int warehouseId, InventoryTransactionSign sign,
        decimal quantity, bool isReversal = false, long? relatedId = null, decimal? unitCost = null)
    {
        var detail = detailId ?? _nextDetail++;
        var doc = Doc(type, warehouseId, detail, quantity, unitCost);
        var transaction = Tx(doc, detail, warehouseId, sign, quantity);
        transaction.RelatedTransactionId = relatedId;
        await new InventoryValuationService(_db, []).ApplyAsync(doc, type, [transaction], isReversal, default);
        _db.InventoryTransactions.Add(transaction);
        await _db.SaveChangesAsync();
        return transaction;
    }

    private static InventoryDocHeader Doc(InventoryDocType type, int warehouseId, long detailId, decimal quantity, decimal? unitCost) => new()
    {
        Id = detailId,
        DocTypeId = type.Id,
        WarehouseId = warehouseId,
        Details = { new InventoryDocDetail { Id = detailId, ProductId = Product, MainUnitQuantity = quantity, UnitCost = unitCost } }
    };

    private InventoryTransaction Tx(InventoryDocHeader doc, long detailId, int warehouseId, InventoryTransactionSign sign, decimal quantity) => new()
    {
        Id = _nextTransaction++,
        DocHeaderId = doc.Id,
        DocDetailId = detailId,
        DocTypeId = doc.DocTypeId,
        ProductId = Product,
        WarehouseId = warehouseId,
        Sign = sign,
        Quantity = quantity,
        RowVersion = RowVersion
    };

    private async Task SetLevel(ValuationLevel level)
    {
        _db.InventoryValuationSettings.Add(new InventoryValuationSettings { Level = level, RowVersion = RowVersion });
        await _db.SaveChangesAsync();
    }

    private sealed class FakeReferenceReader : IInventoryReferenceReader
    {
        public List<ReferencedCostLine> Lines { get; } = new();

        public Task<List<ReferencedCostLine>> GetPostedCostsAsync(string referenceEntityName, long referenceEntityId, CancellationToken cancellationToken) =>
            Task.FromResult(Lines);

        public Task<List<ReferencedDocLine>> GetLinesAsync(string referenceEntityName, long referenceEntityId, CancellationToken cancellationToken) =>
            throw new NotSupportedException();

        public Task<List<ReferencedDocLine>> GetLinesAsync(string referenceEntityName, IReadOnlyCollection<long> referenceEntityIds, CancellationToken cancellationToken) =>
            throw new NotSupportedException();
    }
}
