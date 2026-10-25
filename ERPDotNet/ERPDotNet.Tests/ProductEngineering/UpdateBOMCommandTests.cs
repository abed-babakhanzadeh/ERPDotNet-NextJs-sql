using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Modules.ProductEngineering.Commands.UpdateBOM;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using ERPDotNet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Tests.ProductEngineering;

public class UpdateBOMCommandTests : IDisposable
{
    private const int ParentProductId = 1;
    private static readonly byte[] RowVersion = [1];

    private readonly string _dbName = Guid.NewGuid().ToString();
    private readonly AppDbContext _db;

    public UpdateBOMCommandTests()
    {
        _db = NewContext();
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Update_edits_header_and_existing_line()
    {
        var bom = await SeedBom(Line(10, 2m));
        var line = bom.Details.Single();

        var command = Command(bom, new BOMDetailUpdateDto { Id = line.Id, ChildProductId = 10, Quantity = 5m });
        command = command with { Title = "نسخه جدید", Version = 2 };
        await Handler().Handle(command, default);

        using var verify = NewContext();
        var saved = await verify.BOMHeaders.Include(x => x.Details).SingleAsync();
        Assert.Equal("نسخه جدید", saved.Title);
        Assert.Equal(2, saved.Version);
        Assert.Equal(5m, Assert.Single(saved.Details).Quantity);
    }

    [Fact]
    public async Task Update_removes_lines_missing_from_request_and_adds_new_ones()
    {
        var bom = await SeedBom(Line(10, 1m), Line(11, 1m));
        var keep = bom.Details.Single(d => d.ChildProductId == 10);

        await Handler().Handle(Command(bom,
            new BOMDetailUpdateDto { Id = keep.Id, ChildProductId = 10, Quantity = 1m },
            new BOMDetailUpdateDto
            {
                ChildProductId = 12, Quantity = 3m,
                Substitutes = { new BOMSubstituteUpdateDto { SubstituteProductId = 20, Priority = 1, Factor = 1m } }
            }), default);

        using var verify = NewContext();
        var details = await verify.BOMDetails.Include(d => d.Substitutes).OrderBy(d => d.ChildProductId).ToListAsync();
        Assert.Equal([10, 12], details.Select(d => d.ChildProductId));
        Assert.Equal(20, Assert.Single(details[1].Substitutes).SubstituteProductId);
    }

    [Fact]
    public async Task Update_edits_adds_and_removes_substitutes()
    {
        var line = Line(10, 1m);
        line.Substitutes.Add(new BOMSubstitute { BOMDetailId = 0, SubstituteProductId = 20, Factor = 1m, RowVersion = RowVersion });
        line.Substitutes.Add(new BOMSubstitute { BOMDetailId = 0, SubstituteProductId = 21, Factor = 1m, RowVersion = RowVersion });
        var bom = await SeedBom(line);
        var savedLine = bom.Details.Single();
        var keep = savedLine.Substitutes.Single(s => s.SubstituteProductId == 20);

        await Handler().Handle(Command(bom, new BOMDetailUpdateDto
        {
            Id = savedLine.Id, ChildProductId = 10, Quantity = 1m,
            Substitutes =
            {
                new BOMSubstituteUpdateDto { Id = keep.Id, SubstituteProductId = 20, Factor = 1.5m },
                new BOMSubstituteUpdateDto { SubstituteProductId = 22, Factor = 1m }
            }
        }), default);

        using var verify = NewContext();
        var subs = await verify.BOMSubstitutes.OrderBy(s => s.SubstituteProductId).ToListAsync();
        Assert.Equal([20, 22], subs.Select(s => s.SubstituteProductId));
        Assert.Equal(1.5m, subs[0].Factor);
    }

    [Fact]
    public async Task Stale_row_version_is_rejected()
    {
        var bom = await SeedBom(Line(10, 1m));

        var command = Command(bom, new BOMDetailUpdateDto { Id = bom.Details.Single().Id, ChildProductId = 10, Quantity = 1m })
            with { RowVersion = [9] };

        await Assert.ThrowsAsync<ConflictException>(() => Handler().Handle(command, default));
    }

    [Fact]
    public async Task Validator_rejects_duplicate_components()
    {
        var bom = await SeedBom(Line(10, 1m));

        var result = await Validator().ValidateAsync(Command(bom,
            new BOMDetailUpdateDto { ChildProductId = 10, Quantity = 1m },
            new BOMDetailUpdateDto { ChildProductId = 10, Quantity = 2m }));

        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task Validator_rejects_product_as_its_own_component()
    {
        var bom = await SeedBom(Line(10, 1m));

        var result = await Validator().ValidateAsync(Command(bom,
            new BOMDetailUpdateDto { ChildProductId = ParentProductId, Quantity = 1m }));

        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task Validator_rejects_second_active_main_bom_for_same_product()
    {
        await SeedBom(Line(10, 1m));
        var second = await SeedBom(usage: BOMUsage.Alternate, lines: Line(10, 1m));

        var result = await Validator().ValidateAsync(Command(second,
            new BOMDetailUpdateDto { ChildProductId = 10, Quantity = 1m }) with { Usage = BOMUsage.Main, IsActive = true });

        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task Validator_accepts_valid_update()
    {
        var bom = await SeedBom(Line(10, 1m));

        var result = await Validator().ValidateAsync(Command(bom,
            new BOMDetailUpdateDto { Id = bom.Details.Single().Id, ChildProductId = 10, Quantity = 1m, WastePercentage = 5m }));

        Assert.True(result.IsValid, string.Join(" | ", result.Errors.Select(e => e.ErrorMessage)));
    }

    private AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(_dbName).Options);

    private UpdateBOMHandler Handler() => new(_db);

    private UpdateBOMValidator Validator() => new(NewContext());

    private static BOMDetail Line(int childProductId, decimal qty) =>
        new() { BOMHeaderId = 0, ChildProductId = childProductId, Quantity = qty, InputQuantity = qty, InputUnitId = 1, RowVersion = RowVersion };

    private Task<BOMHeader> SeedBom(params BOMDetail[] lines) => SeedBom(BOMUsage.Main, lines);

    private async Task<BOMHeader> SeedBom(BOMUsage usage, params BOMDetail[] lines)
    {
        using var seed = NewContext();
        var bom = new BOMHeader
        {
            ProductId = ParentProductId, Title = "فرمول", Version = 1, Usage = usage, IsActive = true,
            FromDate = new DateTime(2026, 1, 1), RowVersion = RowVersion, Details = lines.ToList()
        };
        seed.BOMHeaders.Add(bom);
        await seed.SaveChangesAsync();
        return bom;
    }

    private static UpdateBOMCommand Command(BOMHeader bom, params BOMDetailUpdateDto[] details) => new()
    {
        Id = bom.Id,
        Title = bom.Title,
        Version = bom.Version,
        Usage = bom.Usage,
        Type = bom.Type,
        Status = bom.Status,
        IsActive = bom.IsActive,
        FromDate = bom.FromDate,
        RowVersion = RowVersion,
        Details = details.ToList()
    };
}
