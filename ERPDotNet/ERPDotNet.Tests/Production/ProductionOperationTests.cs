using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Modules.Production.Commands.CreateProductionOrder;
using ERPDotNet.Application.Modules.Production.Commands.OperationReports;
using ERPDotNet.Application.Modules.Production.Commands.UpdateProductionOrder;
using ERPDotNet.Application.Modules.Production.Queries.GetProductionOrderOperations;
using ERPDotNet.Application.Modules.Production.Queries.GetWorkCenterLoad;
using ERPDotNet.Application.Modules.Production.Services;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using ERPDotNet.Domain.Modules.Production.Entities;
using ERPDotNet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Tests.Production;

// عملیات سفارش تولید از مسیر فرمول، گزارش کارکرد و بار مرکز کاری
public class ProductionOperationTests : IDisposable
{
    private static readonly byte[] RowVersion = [1];

    private readonly AppDbContext _db =
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private readonly Product _chair, _wood;
    private readonly WorkCenter _saw, _paint;

    public ProductionOperationTests()
    {
        _chair = new Product { Code = "CHAIR", Name = "صندلی", UnitId = 1, SupplyType = ProductSupplyType.Manufactured };
        _wood = new Product { Code = "WOOD", Name = "چوب", UnitId = 1, SupplyType = ProductSupplyType.Purchased };
        _saw = new WorkCenter { Code = "SAW", Title = "اره", HoursPerDay = 8, RowVersion = RowVersion };
        _paint = new WorkCenter { Code = "PNT", Title = "رنگ", HoursPerDay = 4, RowVersion = RowVersion };
        _db.Products.AddRange(_chair, _wood);
        _db.WorkCenters.AddRange(_saw, _paint);
        _db.SaveChanges();
        // فرمول برای ۱۰ صندلی: برش ۱۵ دقیقه آماده‌سازی + ۳۰ دقیقه اجرا؛ رنگ ۶۰ دقیقه اجرا
        var bom = new BOMHeader
        {
            ProductId = _chair.Id, Title = "صندلی", Version = 1, BaseQuantity = 10, FromDate = DateTime.UtcNow.AddDays(-1),
            Details = { new BOMDetail { BOMHeaderId = 0, ChildProductId = _wood.Id, Quantity = 4 } },
            Operations =
            {
                new BOMOperation { BOMHeaderId = 0, Sequence = 10, Title = "برش", WorkCenterId = _saw.Id, SetupMinutes = 15, RunMinutes = 30 },
                new BOMOperation { BOMHeaderId = 0, Sequence = 20, Title = "رنگ", WorkCenterId = _paint.Id, RunMinutes = 60 },
            }
        };
        _db.BOMHeaders.Add(bom);
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public void Efficiency_compares_standard_time_of_the_work_done_with_actual_time()
    {
        // برنامه: ۱۵ آماده‌سازی + ۷۵ اجرا برای ۲۵ واحد؛ ۱۰ سالم و ۰ ضایعات در ۴۵ دقیقه
        var result = OperationProgress.Compute(15, 75, 25, [new OperationProgress.Report(8, 0, 15, 20), new OperationProgress.Report(2, 0, 0, 10)]);

        Assert.Equal((10m, 45m), (result.GoodQuantity, result.ActualMinutes));
        Assert.Equal(45m, result.EarnedMinutes); // ۱۵ + ۷۵ × ۱۰/۲۵
        Assert.Equal(100m, result.EfficiencyPercent);
        Assert.Equal(45m, result.RemainingMinutes); // آماده‌سازی انجام شده؛ ۷۵ × ۱۵/۲۵
        Assert.Equal(40m, result.ProgressPercent);

        var notStarted = OperationProgress.Compute(15, 75, 25, []);
        Assert.Equal(((decimal?)null, 90m), (notStarted.EfficiencyPercent, notStarted.RemainingMinutes));
    }

    [Fact]
    public async Task Order_copies_the_routing_scaled_to_its_quantity_and_resyncs_while_draft()
    {
        var id = await new CreateProductionOrderHandler(_db).Handle(new CreateProductionOrderCommand { ProductId = _chair.Id, Quantity = 25 }, default);

        var operations = await _db.ProductionOrderOperations.Where(o => o.ProductionOrderId == id).OrderBy(o => o.Sequence).ToListAsync();
        Assert.Equal([(10, 15m, 75m), (20, 0m, 150m)], operations.Select(o => (o.Sequence, o.PlannedSetupMinutes, o.PlannedRunMinutes)));

        await new UpdateProductionOrderHandler(_db).Handle(new UpdateProductionOrderCommand { Id = id, Quantity = 5 }, default);
        var after = await _db.ProductionOrderOperations.Where(o => o.ProductionOrderId == id).OrderBy(o => o.Sequence).ToListAsync();
        Assert.Same(operations[0], after[0]);
        Assert.Equal([15m, 30m], after.Select(o => o.PlannedRunMinutes));
    }

    [Fact]
    public async Task Reports_need_a_released_order_and_its_own_operation()
    {
        var id = await new CreateProductionOrderHandler(_db).Handle(new CreateProductionOrderCommand { ProductId = _chair.Id, Quantity = 10 }, default);
        var cut = await _db.ProductionOrderOperations.FirstAsync(o => o.ProductionOrderId == id && o.Sequence == 10);
        var handler = new OperationReportCommandsHandler(_db);
        var report = new ReportOperationCommand { OrderId = id, OperationId = cut.Id, GoodQuantity = 4, SetupMinutes = 15, RunMinutes = 12 };

        await Assert.ThrowsAsync<BusinessRuleException>(() => handler.Handle(report, default));

        var order = await _db.ProductionOrders.FindAsync(id);
        order!.Status = ProductionOrderStatus.Released;
        await _db.SaveChangesAsync();
        await Assert.ThrowsAsync<BusinessRuleException>(() => handler.Handle(report with { OperationId = cut.Id + 999 }, default));

        var reportId = await handler.Handle(report, default);
        Assert.Equal(ProductionOrderStatus.InProgress, order.Status);

        var ops = await new GetProductionOrderOperationsHandler(_db).Handle(new GetProductionOrderOperationsQuery(id), default);
        Assert.Equal((4m, 27m, 40m), (ops[0].GoodQuantity, ops[0].ActualSetupMinutes + ops[0].ActualRunMinutes, ops[0].ProgressPercent));
        Assert.Single(ops[0].Reports);

        // حذف نرم: گزارش از محاسبه بیرون می‌رود
        await handler.Handle(new DeleteOperationReportCommand(id, reportId), default);
        ops = await new GetProductionOrderOperationsHandler(_db).Handle(new GetProductionOrderOperationsQuery(id), default);
        Assert.Empty(ops[0].Reports);

        order.Status = ProductionOrderStatus.Completed;
        await _db.SaveChangesAsync();
        await Assert.ThrowsAsync<BusinessRuleException>(() => handler.Handle(report, default));
    }

    [Fact]
    public async Task Load_is_the_remaining_planned_time_of_open_orders_over_daily_capacity()
    {
        var open = await new CreateProductionOrderHandler(_db).Handle(new CreateProductionOrderCommand { ProductId = _chair.Id, Quantity = 20 }, default);
        var draft = await new CreateProductionOrderHandler(_db).Handle(new CreateProductionOrderCommand { ProductId = _chair.Id, Quantity = 100 }, default);
        (await _db.ProductionOrders.FindAsync(open))!.Status = ProductionOrderStatus.Released;
        await _db.SaveChangesAsync();
        var cut = await _db.ProductionOrderOperations.FirstAsync(o => o.ProductionOrderId == open && o.Sequence == 10);
        await new OperationReportCommandsHandler(_db).Handle(
            new ReportOperationCommand { OrderId = open, OperationId = cut.Id, GoodQuantity = 10, SetupMinutes = 15, RunMinutes = 30 }, default);

        var load = (await new GetWorkCenterLoadHandler(_db).Handle(new GetWorkCenterLoadQuery(), default)).ToDictionary(l => l.Code);

        // اره: آماده‌سازی انجام شده، ۶۰ × ۱۰/۲۰ = ۳۰ دقیقه مانده؛ سفارش پیش‌نویس حساب نمی‌شود
        Assert.Equal((1, 30m, 0.06m), (load["SAW"].OpenOrderCount, load["SAW"].RemainingMinutes, load["SAW"].LoadDays));
        // رنگ: ۱۲۰ دقیقه برای ۲۰ واحد، ظرفیت ۲۴۰ دقیقه در روز
        Assert.Equal((120m, 0.5m), (load["PNT"].RemainingMinutes, load["PNT"].LoadDays));
        Assert.NotEqual(0, draft);
    }
}
