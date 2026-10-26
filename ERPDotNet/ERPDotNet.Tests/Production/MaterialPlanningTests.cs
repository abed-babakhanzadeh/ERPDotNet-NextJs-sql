using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Modules.Inventory.Services;
using ERPDotNet.Application.Modules.Production.Queries.GetMaterialPlan;
using ERPDotNet.Application.Modules.Production.Services;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using ERPDotNet.Domain.Modules.Production.Entities;
using ERPDotNet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using static ERPDotNet.Application.Modules.Production.Services.MaterialPlanning;

namespace ERPDotNet.Tests.Production;

// برنامه‌ریزی چندسطحی مواد و کسری سفارش‌های باز
public class MaterialPlanningTests : IDisposable
{
    private const int Cake = 1, Dough = 2, Sugar = 3, Flour = 4;
    private static readonly byte[] RowVersion = [1];

    private static PlanBom Bom(int id, decimal baseQuantity, params (int Product, decimal Quantity, decimal Waste)[] lines) =>
        new(id, $"BOM {id}", 1, baseQuantity, lines.Select(l => new PlanComponent(l.Product, l.Quantity, l.Waste)).ToList());

    // کیک = ۲ خمیر + ۱ شکر؛ خمیر = ۳ آرد + ۰٫۵ شکر (شکر در دو سطح)
    private static readonly PlanBom CakeBom = Bom(10, 1, (Dough, 2, 0), (Sugar, 1, 0));
    private static readonly PlanBom DoughBom = Bom(20, 1, (Flour, 3, 0), (Sugar, 0.5m, 0));

    private static Result Run(
        Dictionary<int, decimal>? onHand = null,
        Dictionary<int, decimal>? scheduled = null,
        Dictionary<int, decimal>? orders = null,
        Demand? demand = null,
        Dictionary<int, PlanBom>? boms = null) =>
        Plan(new Input(boms ?? new() { [Dough] = DoughBom }, onHand ?? new(), scheduled ?? new(), orders ?? new(), demand));

    [Fact]
    public void Shortage_is_netted_level_by_level_and_each_item_once_at_its_lowest_level()
    {
        var result = Run(onHand: new() { [Dough] = 5, [Sugar] = 4, [Flour] = 10 }, demand: new Demand(Cake, 10, CakeBom));

        var line = result.Lines.ToDictionary(l => l.ProductId);
        Assert.True(line[Cake].IsDemandRoot);
        // ۲۰ خمیر لازم، ۵ موجود ← ۱۵ تولید
        Assert.Equal((1, 20m, 15m, PlanAction.Produce), (line[Dough].Level, line[Dough].GrossRequirement, line[Dough].NetShortage, line[Dough].Action));
        // آرد فقط برای ۱۵ خمیرِ کسری باز می‌شود
        Assert.Equal((45m, 35m, PlanAction.Purchase), (line[Flour].GrossRequirement, line[Flour].NetShortage, line[Flour].Action));
        // شکر: ۱۰ مستقیم + ۷٫۵ از خمیر؛ موجودی ۴ فقط یک بار کم می‌شود
        Assert.Equal((2, 17.5m, 13.5m), (line[Sugar].Level, line[Sugar].GrossRequirement, line[Sugar].NetShortage));
        Assert.Single(result.Lines, l => l.ProductId == Sugar);
    }

    [Fact]
    public void Open_orders_need_their_outstanding_materials_and_their_remaining_output_is_supply()
    {
        // سفارش باز ۶ خمیر لازم دارد؛ ۴ خمیر در سفارش دیگری در حال تولید است و ۱ موجود
        var result = Run(onHand: new() { [Dough] = 1 }, scheduled: new() { [Dough] = 4 }, orders: new() { [Dough] = 6 });

        var dough = result.Lines.Single(l => l.ProductId == Dough);
        Assert.Equal((6m, 0m, 1m, PlanAction.Produce), (dough.OpenOrderDemand, dough.PlanDemand, dough.NetShortage, dough.Action));
        Assert.Equal(3m, result.Lines.Single(l => l.ProductId == Flour).PlanDemand);
    }

    [Fact]
    public void Explosion_uses_base_quantity_and_waste()
    {
        var bom = Bom(30, baseQuantity: 10, (Flour, 2, 5));
        var result = Run(boms: new(), demand: new Demand(Cake, 25, bom));

        Assert.Equal(5.25m, result.Lines.Single(l => l.ProductId == Flour).NetShortage);
    }

    [Fact]
    public void Covered_items_need_no_action()
    {
        var result = Run(onHand: new() { [Dough] = 100 }, orders: new() { [Dough] = 6 });

        Assert.Equal(PlanAction.None, Assert.Single(result.Lines).Action);
    }

    [Fact]
    public void Stock_goes_to_orders_by_priority()
    {
        var shortages = AllocateOrders(
            [new OrderNeed(1, [(Flour, 6m), (Sugar, 1m)]), new OrderNeed(2, [(Flour, 6m)])],
            new Dictionary<int, decimal> { [Flour] = 10, [Sugar] = 1 });

        Assert.True(shortages[0].CanStart);
        Assert.False(shortages[1].CanStart);
        Assert.Equal(2m, shortages[1].Materials.Single().Shortage);
    }

    [Fact]
    public void A_cycle_in_boms_is_reported_instead_of_looping()
    {
        var result = Run(boms: new() { [Dough] = Bom(1, 1, (Flour, 1, 0)), [Flour] = Bom(2, 1, (Dough, 1, 0)) }, orders: new() { [Dough] = 1 });

        Assert.NotEmpty(result.CyclicProducts);
    }

    // === کل پرس‌وجو روی دیتابیس ===

    private readonly AppDbContext _db = new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Plan_uses_only_usable_stock_and_reports_shortages_per_order()
    {
        _db.Units.Add(new ERPDotNet.Domain.Modules.BaseInfo.Entities.Unit { Id = 1, Title = "کیلو", Symbol = "kg", RowVersion = RowVersion });
        var cake = AddProduct("CAKE", ProductSupplyType.Manufactured);
        var dough = AddProduct("DOUGH", ProductSupplyType.Manufactured);
        var flour = AddProduct("FLOUR", ProductSupplyType.Purchased);
        var cream = AddProduct("CREAM", ProductSupplyType.Manufactured); // بدون فرمول
        var packing = AddProduct("PACK", ProductSupplyType.Service);
        await _db.SaveChangesAsync();
        AddBom(cake, (dough, 2), (cream, 1), (packing, 1));
        AddBom(dough, (flour, 3));

        var main = AddWarehouse("W1", WarehouseType.Physical);
        var scrap = AddWarehouse("W2", WarehouseType.Scrap);
        var other = AddWarehouse("W3", WarehouseType.Physical);
        await _db.SaveChangesAsync();
        var quarantined = new InventoryBatch { ProductId = flour.Id, BatchNumber = "Q1", QcStatus = BatchQcStatus.Quarantine, RowVersion = RowVersion };
        _db.InventoryBatches.Add(quarantined);
        await _db.SaveChangesAsync();
        AddStock(main, flour, 10);
        AddStock(main, flour, 100, quarantined.Id); // قرنطینه حساب نمی‌شود
        AddStock(scrap, flour, 100); // انبار ضایعات حساب نمی‌شود
        AddStock(other, flour, 5);

        // سفارش باز خمیر: ۴ خمیر = ۱۲ آرد؛ ۲ آرد قبلاً قطعی صادر شده
        var order = new ProductionOrder
        {
            OrderNumber = "MO-1", ProductId = dough.Id, BOMHeaderId = 1, Quantity = 4, Status = ProductionOrderStatus.Released,
            PlannedStartDate = DateTime.UtcNow.AddDays(1),
            Materials = { new ProductionOrderMaterial { ProductId = flour.Id, StandardQuantity = 12, RequiredQuantity = 12 } }
        };
        _db.ProductionOrders.Add(order);
        await _db.SaveChangesAsync();
        var output = new InventoryDocType { Title = "حواله", Nature = InventoryNature.Output, RowVersion = RowVersion };
        _db.InventoryDocTypes.Add(output);
        await _db.SaveChangesAsync();
        _db.InventoryDocHeaders.Add(new InventoryDocHeader
        {
            DocTypeId = output.Id, WarehouseId = main.Id, Status = InventoryDocStatus.Posted, RowVersion = RowVersion,
            ReferenceEntityName = ProductionProgress.ReferenceName, ReferenceEntityId = order.Id,
            Details = { new InventoryDocDetail { ProductId = flour.Id, MainUnitQuantity = 2, RowVersion = RowVersion } }
        });
        await _db.SaveChangesAsync();

        var plan = await Handler(allowed: null).Handle(new GetMaterialPlanQuery { ProductId = cake.Id, Quantity = 3 }, default);

        var line = plan.Lines.ToDictionary(l => l.ProductCode);
        // کیک ۳ ← ۶ خمیر؛ ۴ خمیر در سفارش باز در حال تولید است ← ۲ تولید پیشنهادی ← ۶ آرد
        // آرد: ۱۰ باقی‌مانده سفارش + ۶ برنامه؛ موجودی قابل مصرف ۱۵ (قرنطینه و ضایعات حساب نمی‌شود) ← ۱ خرید
        Assert.Equal((6m, 4m, 2m, 1), (line["DOUGH"].GrossRequirement, line["DOUGH"].ScheduledReceipts, line["DOUGH"].NetShortage, line["DOUGH"].ActionId));
        Assert.Equal((10m, 6m, 15m, 1m, 2), (line["FLOUR"].OpenOrdersDemand, line["FLOUR"].PlanDemand, line["FLOUR"].OnHand, line["FLOUR"].NetShortage, line["FLOUR"].ActionId));
        Assert.Equal(2, line["CREAM"].ActionId);
        Assert.DoesNotContain("PACK", line.Keys);
        Assert.Contains(plan.Warnings, w => w.Contains("CREAM"));
        Assert.False(plan.StockLimitedToAccessibleWarehouses);

        var orderRow = Assert.Single(plan.Orders);
        Assert.True(orderRow.CanStart);

        // با دسترسی فقط به انبار اصلی، موجودی انبار دیگر دیده نمی‌شود
        var limited = await Handler(allowed: [main.Id]).Handle(new GetMaterialPlanQuery { IncludeOpenOrders = true }, default);
        Assert.True(limited.StockLimitedToAccessibleWarehouses);
        Assert.Equal(10m, limited.Lines.Single(l => l.ProductCode == "FLOUR").OnHand);
        Assert.True(limited.Orders.Single().CanStart);
        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Handler(null).Handle(new GetMaterialPlanQuery { ProductId = flour.Id, Quantity = 1 }, default));
    }

    private GetMaterialPlanHandler Handler(IReadOnlyCollection<int>? allowed) =>
        new(_db, new InventoryReferenceReader(_db), new InventoryAvailabilityReader(_db, new FixedAccess(allowed)));

    private Product AddProduct(string code, ProductSupplyType type)
    {
        var p = new Product { Code = code, Name = code, UnitId = 1, SupplyType = type };
        _db.Products.Add(p);
        return p;
    }

    private void AddBom(Product product, params (Product Child, decimal Quantity)[] lines)
    {
        _db.BOMHeaders.Add(new BOMHeader
        {
            ProductId = product.Id, Title = $"BOM {product.Code}", Version = 1, BaseQuantity = 1, FromDate = DateTime.UtcNow.AddDays(-1),
            Details = lines.Select(l => new BOMDetail { BOMHeaderId = 0, ChildProductId = l.Child.Id, Quantity = l.Quantity }).ToList()
        });
        _db.SaveChanges();
    }

    private Warehouse AddWarehouse(string code, WarehouseType type)
    {
        var w = new Warehouse { Title = code, Code = code, Type = type, RowVersion = RowVersion };
        _db.Warehouses.Add(w);
        return w;
    }

    private void AddStock(Warehouse warehouse, Product product, decimal quantity, int? batchId = null)
    {
        _db.CurrentStocks.Add(new CurrentStock { WarehouseId = warehouse.Id, ProductId = product.Id, BatchId = batchId, QuantityOnHand = quantity, RowVersion = RowVersion });
        _db.SaveChanges();
    }

    private sealed class FixedAccess(IReadOnlyCollection<int>? allowed) : IWarehouseAccessService
    {
        public Task<IReadOnlyCollection<int>?> GetAllowedWarehouseIdsAsync(CancellationToken cancellationToken) => Task.FromResult(allowed);
        public Task EnsureAccessAsync(int warehouseId, CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
