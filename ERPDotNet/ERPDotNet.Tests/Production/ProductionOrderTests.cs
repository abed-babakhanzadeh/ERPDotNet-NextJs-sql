using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Modules.Production.Commands.ChangeProductionOrderStatus;
using ERPDotNet.Application.Modules.Production.Commands.CreateProductionOrder;
using ERPDotNet.Application.Modules.Production.Commands.UpdateProductionOrder;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using ERPDotNet.Domain.Modules.Production.Entities;
using ERPDotNet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Tests.Production;

// سفارش تولید: انتخاب فرمول و محاسبه نیاز مواد
public class ProductionOrderTests : IDisposable
{
    private readonly AppDbContext _db =
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private readonly Product _cake, _flour, _sugar;

    public ProductionOrderTests()
    {
        _cake = NewProduct("CAKE");
        _flour = NewProduct("FLOUR");
        _sugar = NewProduct("SUGAR");
        _db.Products.AddRange(_cake, _flour, _sugar);
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Requirements_scale_from_base_quantity_and_include_waste()
    {
        // فرمول برای ۱۰ کیک: ۲ آرد با ۵٪ ضایعات و ۱ شکر
        AddBom(version: 1, baseQuantity: 10, (_flour, 2m, 5m), (_sugar, 1m, 0m));

        var id = await Create(25);

        var order = await _db.ProductionOrders.Include(o => o.Materials).SingleAsync(o => o.Id == id);
        Assert.Equal($"MO-{id:D5}", order.OrderNumber);
        var flour = order.Materials.Single(m => m.ProductId == _flour.Id);
        Assert.Equal(5m, flour.StandardQuantity);
        Assert.Equal(5.25m, flour.RequiredQuantity);
        Assert.Equal(2.5m, order.Materials.Single(m => m.ProductId == _sugar.Id).RequiredQuantity);
    }

    [Fact]
    public async Task Default_is_the_latest_main_bom_and_unusable_boms_are_rejected()
    {
        AddBom(version: 1, baseQuantity: 1, (_flour, 1m, 0m));
        var latest = AddBom(version: 2, baseQuantity: 1, (_flour, 3m, 0m));
        var alternate = AddBom(version: 3, baseQuantity: 1, (_sugar, 1m, 0m));
        alternate.Usage = BOMUsage.Alternate;
        var draft = AddBom(version: 4, baseQuantity: 1, (_sugar, 1m, 0m));
        draft.Status = BOMStatus.Draft;
        _db.SaveChanges();

        var order = await _db.ProductionOrders.FindAsync(await Create(1));
        Assert.Equal(latest.Id, order!.BOMHeaderId);
        await Assert.ThrowsAsync<BusinessRuleException>(() => Create(1, draft.Id));
        var otherProductBom = AddBom(version: 1, baseQuantity: 1, (_sugar, 1m, 0m), product: _flour);
        await Assert.ThrowsAsync<BusinessRuleException>(() => Create(1, otherProductBom.Id));
        Assert.NotEqual(0, await Create(1, alternate.Id));
    }

    [Fact]
    public async Task Only_draft_orders_are_edited_and_released_orders_can_still_be_cancelled()
    {
        AddBom(version: 1, baseQuantity: 1, (_flour, 2m, 0m));
        var id = await Create(1);

        await new UpdateProductionOrderHandler(_db).Handle(new UpdateProductionOrderCommand { Id = id, Quantity = 4 }, default);
        Assert.Equal(8m, (await _db.ProductionOrderMaterials.SingleAsync(m => m.ProductionOrderId == id)).RequiredQuantity);

        var status = new ChangeProductionOrderStatusHandler(_db);
        await status.Handle(new ReleaseProductionOrderCommand(id), default);
        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            new UpdateProductionOrderHandler(_db).Handle(new UpdateProductionOrderCommand { Id = id, Quantity = 5 }, default));
        await Assert.ThrowsAsync<BusinessRuleException>(() => status.Handle(new ReleaseProductionOrderCommand(id), default));

        await status.Handle(new CancelProductionOrderCommand(id), default);
        Assert.Equal(ProductionOrderStatus.Cancelled, (await _db.ProductionOrders.FindAsync(id))!.Status);
    }

    private Task<int> Create(decimal quantity, int? bomId = null) =>
        new CreateProductionOrderHandler(_db).Handle(
            new CreateProductionOrderCommand { ProductId = _cake.Id, BOMHeaderId = bomId, Quantity = quantity }, default);

    private BOMHeader AddBom(int version, decimal baseQuantity, params (Product Child, decimal Quantity, decimal Waste)[] lines) =>
        AddBom(version, baseQuantity, lines, _cake);

    private BOMHeader AddBom(int version, decimal baseQuantity, (Product Child, decimal Quantity, decimal Waste) line, Product product) =>
        AddBom(version, baseQuantity, [line], product);

    private BOMHeader AddBom(int version, decimal baseQuantity, (Product Child, decimal Quantity, decimal Waste)[] lines, Product product)
    {
        var bom = new BOMHeader
        {
            ProductId = product.Id,
            Title = $"BOM {version}",
            Version = version,
            BaseQuantity = baseQuantity,
            FromDate = DateTime.UtcNow.AddDays(-1),
            Details = lines.Select(l => new BOMDetail
            {
                BOMHeaderId = 0,
                ChildProductId = l.Child.Id,
                Quantity = l.Quantity,
                WastePercentage = l.Waste
            }).ToList()
        };
        _db.BOMHeaders.Add(bom);
        _db.SaveChanges();
        return bom;
    }

    private static Product NewProduct(string code) =>
        new() { Code = code, Name = code, UnitId = 1, SupplyType = ProductSupplyType.Manufactured };
}
