using ERPDotNet.Application.Modules.ProductEngineering.Commands.CreateBOM;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using ERPDotNet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Tests.ProductEngineering;

public class CreateBOMCommandTests : IDisposable
{
    private static readonly byte[] RowVersion = [1];

    private readonly AppDbContext _db =
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Validator_rejects_product_as_its_own_component()
    {
        var result = await new CreateBOMValidator(_db).ValidateAsync(Command(1, 1));

        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task Validator_rejects_indirect_cycle()
    {
        // 10 → 1 ثبت شده؛ فرمول 1 با جزء 10 حلقه می‌سازد
        await SeedBom(10, 1);

        var result = await new CreateBOMValidator(_db).ValidateAsync(Command(1, 10));

        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task Validator_ignores_deleted_boms_when_looking_for_cycles()
    {
        var old = await SeedBom(10, 1);
        old.IsDeleted = true;
        await _db.SaveChangesAsync();

        var result = await new CreateBOMValidator(_db).ValidateAsync(Command(1, 10));

        Assert.True(result.IsValid, string.Join(" | ", result.Errors.Select(e => e.ErrorMessage)));
    }

    private async Task<BOMHeader> SeedBom(int productId, int childProductId)
    {
        var bom = new BOMHeader
        {
            ProductId = productId, Title = "فرمول", Version = 1, RowVersion = RowVersion,
            Details = { new BOMDetail { BOMHeaderId = 0, ChildProductId = childProductId, Quantity = 1m, InputUnitId = 1, RowVersion = RowVersion } }
        };
        _db.BOMHeaders.Add(bom);
        await _db.SaveChangesAsync();
        return bom;
    }

    private static CreateBOMCommand Command(int productId, int childProductId) => new()
    {
        ProductId = productId,
        Title = "فرمول جدید",
        Version = 1,
        FromDate = new DateTime(2026, 1, 1),
        Details = { new BOMDetailInputDto { ChildProductId = childProductId, Quantity = 1m, InputUnitId = 1 } }
    };
}
