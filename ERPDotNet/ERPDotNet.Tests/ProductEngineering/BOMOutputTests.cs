using ERPDotNet.Application.Modules.ProductEngineering.Commands;
using ERPDotNet.Application.Modules.ProductEngineering.Commands.CreateBOM;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using ERPDotNet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Tests.ProductEngineering;

public class BOMOutputTests : IDisposable
{
    private readonly AppDbContext _db =
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Valid_base_quantity_and_outputs_pass()
    {
        var result = await Validate(100m,
            Output(20, BOMOutputType.CoProduct, 30m),
            Output(21, BOMOutputType.ByProduct, 0m));

        Assert.True(result.IsValid, string.Join(" | ", result.Errors.Select(e => e.ErrorMessage)));
    }

    [Fact]
    public async Task Zero_base_quantity_is_rejected()
    {
        var result = await Validate(0m);

        Assert.Contains(result.Errors, e => e.ErrorMessage == BOMOutputRules.BaseQuantityMessage);
    }

    [Fact]
    public async Task Main_product_cannot_be_its_own_output()
    {
        var result = await Validate(1m, Output(1, BOMOutputType.CoProduct, 10m));

        Assert.Contains(result.Errors, e => e.ErrorMessage == BOMOutputRules.MainProductMessage);
    }

    [Fact]
    public async Task Co_product_shares_must_leave_a_share_for_the_main_product()
    {
        var result = await Validate(1m,
            Output(20, BOMOutputType.CoProduct, 60m),
            Output(21, BOMOutputType.CoProduct, 40m));

        Assert.Contains(result.Errors, e => e.ErrorMessage == BOMOutputRules.CostShareMessage);
    }

    [Fact]
    public async Task By_product_cannot_carry_a_cost_share_and_outputs_must_be_distinct()
    {
        var result = await Validate(1m,
            Output(20, BOMOutputType.ByProduct, 5m),
            Output(20, BOMOutputType.ByProduct, 0m));

        Assert.Contains(result.Errors, e => e.ErrorMessage == "محصول فرعی سهمی از بهای تمام‌شده ندارد.");
        Assert.Contains(result.Errors, e => e.ErrorMessage == BOMOutputRules.DuplicateMessage);
    }

    [Fact]
    public void Sync_updates_kept_outputs_removes_dropped_and_adds_new()
    {
        var kept = new BOMOutput { BOMHeaderId = 5, ProductId = 20, Type = BOMOutputType.CoProduct, Quantity = 1m, CostSharePercent = 10m };
        var dropped = new BOMOutput { BOMHeaderId = 5, ProductId = 21, Quantity = 1m };
        var bom = new BOMHeader { Id = 5, ProductId = 1, Title = "فرمول", Outputs = { kept, dropped } };

        BOMOutputRules.Sync(bom, [Output(20, BOMOutputType.ByProduct, 0m, 2m), Output(22, BOMOutputType.CoProduct, 15m)]);

        Assert.Equal([20, 22], bom.Outputs.Select(o => o.ProductId).Order());
        Assert.Same(kept, bom.Outputs.Single(o => o.ProductId == 20));
        Assert.Equal(BOMOutputType.ByProduct, kept.Type);
        Assert.Equal(2m, kept.Quantity);
        Assert.Equal(0m, kept.CostSharePercent);
    }

    private Task<FluentValidation.Results.ValidationResult> Validate(decimal baseQuantity, params BOMOutputInputDto[] outputs) =>
        new CreateBOMValidator(_db).ValidateAsync(new CreateBOMCommand
        {
            ProductId = 1,
            Title = "فرمول",
            Version = 1,
            FromDate = new DateTime(2026, 1, 1),
            BaseQuantity = baseQuantity,
            Details = { new BOMDetailInputDto { ChildProductId = 10, Quantity = 1m, InputUnitId = 1 } },
            Outputs = outputs.ToList(),
        });

    private static BOMOutputInputDto Output(int productId, BOMOutputType type, decimal share, decimal quantity = 1m) =>
        new() { ProductId = productId, Type = type, CostSharePercent = share, Quantity = quantity };
}
