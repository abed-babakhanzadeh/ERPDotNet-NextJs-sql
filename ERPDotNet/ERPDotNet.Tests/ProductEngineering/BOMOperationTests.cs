using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Modules.BaseInfo.Contracts;
using ERPDotNet.Application.Modules.Production.Commands.WorkCenters;
using ERPDotNet.Application.Modules.Production.Services;
using ERPDotNet.Application.Modules.ProductEngineering.Commands;
using ERPDotNet.Application.Modules.ProductEngineering.Commands.CreateBOM;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using ERPDotNet.Domain.Modules.Production.Entities;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using ERPDotNet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Tests.ProductEngineering;

// مسیر تولید فرمول و مراکز کاری
public class BOMOperationTests : IDisposable
{
    private static readonly byte[] RowVersion = [1];

    private readonly AppDbContext _db =
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private readonly int _cutting, _retired;

    public BOMOperationTests()
    {
        var cutting = new WorkCenter { Code = "CUT", Title = "برش", RowVersion = RowVersion };
        var retired = new WorkCenter { Code = "OLD", Title = "قدیمی", IsActive = false, RowVersion = RowVersion };
        _db.WorkCenters.AddRange(cutting, retired);
        _db.SaveChanges();
        (_cutting, _retired) = (cutting.Id, retired.Id);
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Valid_operations_pass()
    {
        var result = await Validate(Operation(10, _cutting, setup: 15, run: 2), Operation(20, _cutting, setup: 0, run: 1));

        Assert.True(result.IsValid, string.Join(" | ", result.Errors.Select(e => e.ErrorMessage)));
    }

    [Fact]
    public async Task Sequence_must_be_unique_and_time_must_be_positive()
    {
        var result = await Validate(Operation(10, _cutting, 1, 1), Operation(10, _cutting, 0, 0));

        Assert.Contains(result.Errors, e => e.ErrorMessage == BOMOperationRules.DuplicateMessage);
        Assert.Contains(result.Errors, e => e.ErrorMessage == "عملیات 10: زمان آماده‌سازی یا اجرا باید بیشتر از صفر باشد.");
    }

    [Fact]
    public async Task Inactive_or_unknown_work_center_is_rejected()
    {
        Assert.Contains((await Validate(Operation(10, _retired, 1, 1))).Errors, e => e.ErrorMessage == BOMOperationRules.WorkCenterMessage);
        Assert.Contains((await Validate(Operation(10, 999, 1, 1))).Errors, e => e.ErrorMessage == BOMOperationRules.WorkCenterMessage);
    }

    [Fact]
    public void Sync_keeps_rows_by_sequence_removes_dropped_and_adds_new()
    {
        var kept = new BOMOperation { BOMHeaderId = 5, Sequence = 10, Title = "برش", WorkCenterId = _cutting, RunMinutes = 1 };
        var dropped = new BOMOperation { BOMHeaderId = 5, Sequence = 20, Title = "رنگ", WorkCenterId = _cutting, RunMinutes = 1 };
        var bom = new BOMHeader { Id = 5, ProductId = 1, Title = "فرمول", Operations = { kept, dropped } };

        BOMOperationRules.Sync(bom, [Operation(10, _cutting, 5, 3, " برش نهایی "), Operation(30, _cutting, 0, 2)]);

        Assert.Equal([10, 30], bom.Operations.Select(o => o.Sequence).Order());
        Assert.Same(kept, bom.Operations.Single(o => o.Sequence == 10));
        Assert.Equal(("برش نهایی", 5m, 3m), (kept.Title, kept.SetupMinutes, kept.RunMinutes));
    }

    [Fact]
    public async Task Work_center_used_in_a_routing_cannot_be_deleted()
    {
        var bom = new BOMHeader { ProductId = 1, Title = "فرمول", RowVersion = RowVersion };
        bom.Operations.Add(new BOMOperation { BOMHeaderId = 0, Sequence = 10, Title = "برش", WorkCenterId = _cutting, RunMinutes = 1, RowVersion = RowVersion });
        _db.BOMHeaders.Add(bom);
        await _db.SaveChangesAsync();
        var handler = new WorkCenterCommandsHandler(_db);

        await Assert.ThrowsAsync<BusinessRuleException>(() => handler.Handle(new DeleteWorkCenterCommand(_cutting), default));
        Assert.True(await handler.Handle(new DeleteWorkCenterCommand(_retired), default));
    }

    [Fact]
    public async Task Work_center_code_is_unique_and_hours_are_limited()
    {
        var result = await new CreateWorkCenterValidator(_db).ValidateAsync(new CreateWorkCenterCommand { Code = "CUT", Title = "برش ۲", HoursPerDay = 25 });

        Assert.Contains(result.Errors, e => e.ErrorMessage == "کد مرکز کاری تکراری است.");
        Assert.Contains(result.Errors, e => e.ErrorMessage == "ساعت کاری روزانه باید بیشتر از صفر و حداکثر ۲۴ باشد.");
    }

    [Fact]
    public async Task Cost_center_of_a_work_center_cannot_be_deleted()
    {
        var center = new CostCenter { Code = "P1", Title = "تولید", RowVersion = RowVersion };
        _db.CostCenters.Add(center);
        await _db.SaveChangesAsync();
        var workCenter = await _db.WorkCenters.SingleAsync(w => w.Id == _cutting);
        workCenter.CostCenterId = center.Id;
        await _db.SaveChangesAsync();

        Assert.NotNull(await new ProductionBaseInfoUsageChecker(_db).FindUsageAsync(BaseInfoReference.CostCenter, center.Id, default));
    }

    private Task<FluentValidation.Results.ValidationResult> Validate(params BOMOperationInputDto[] operations) =>
        new CreateBOMValidator(_db).ValidateAsync(new CreateBOMCommand
        {
            ProductId = 1,
            Title = "فرمول",
            Version = 1,
            FromDate = new DateTime(2026, 1, 1),
            Details = { new BOMDetailInputDto { ChildProductId = 10, Quantity = 1m, InputUnitId = 1 } },
            Operations = operations.ToList(),
        });

    private static BOMOperationInputDto Operation(int sequence, int workCenterId, decimal setup, decimal run, string title = "عملیات") =>
        new() { Sequence = sequence, Title = title, WorkCenterId = workCenterId, SetupMinutes = setup, RunMinutes = run };
}
