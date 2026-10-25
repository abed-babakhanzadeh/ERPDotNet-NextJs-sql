using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Modules.BaseInfo.Commands.CreateProductAttribute;
using ERPDotNet.Application.Modules.BaseInfo.Commands.GenerateProductVariants;
using ERPDotNet.Application.Modules.BaseInfo.Commands.UpdateProductAttribute;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using ERPDotNet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Tests.BaseInfo;

// ساخت تنوع کالا از ترکیب مقادیر ویژگی‌ها
public class ProductVariantTests : IDisposable
{
    private readonly AppDbContext _db =
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private readonly Product _shirt;
    private readonly ProductAttribute _color, _size;

    public ProductVariantTests()
    {
        _shirt = new Product { Code = "SH", Name = "پیراهن", UnitId = 1, SupplyType = ProductSupplyType.Purchased };
        _shirt.UnitConversions.Add(new ProductUnitConversion { AlternativeUnitId = 2, Factor = 12 });
        _color = Attribute("COLOR", "رنگ", ("R", "قرمز"), ("B", "آبی"));
        _size = Attribute("SIZE", "سایز", ("S", "کوچک"), ("L", "بزرگ"), ("XL", "خیلی بزرگ"));
        _db.Products.Add(_shirt);
        _db.ProductAttributes.AddRange(_color, _size);
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Every_combination_becomes_a_product_with_copied_settings()
    {
        var created = await Generate(_shirt.Id, Values(_color, "R", "B").Concat(Values(_size, "S", "L")));

        Assert.Equal(4, created);
        var variants = await _db.Products.Include(p => p.UnitConversions)
            .Where(p => p.VariantParentId == _shirt.Id).OrderBy(p => p.Code).ToListAsync();
        Assert.Equal(["SH-B-L", "SH-B-S", "SH-R-L", "SH-R-S"], variants.Select(v => v.Code));
        Assert.Contains(variants, v => v.Name == "پیراهن قرمز کوچک");
        Assert.All(variants, v => Assert.Equal(12, Assert.Single(v.UnitConversions).Factor));
    }

    [Fact]
    public async Task Existing_combinations_are_skipped_on_regeneration()
    {
        await Generate(_shirt.Id, Values(_color, "R").Concat(Values(_size, "S")));

        Assert.Equal(1, await Generate(_shirt.Id, Values(_color, "R").Concat(Values(_size, "S", "L"))));
        Assert.Equal(0, await Generate(_shirt.Id, Values(_color, "R").Concat(Values(_size, "L"))));
        Assert.Equal(2, await _db.Products.CountAsync(p => p.VariantParentId == _shirt.Id));
    }

    [Fact]
    public async Task Attribute_set_must_match_earlier_variants_and_variants_cannot_nest()
    {
        await Generate(_shirt.Id, Values(_color, "R").Concat(Values(_size, "S")));

        await Assert.ThrowsAsync<BusinessRuleException>(() => Generate(_shirt.Id, Values(_color, "B")));
        var variant = await _db.Products.FirstAsync(p => p.VariantParentId == _shirt.Id);
        await Assert.ThrowsAsync<BusinessRuleException>(() => Generate(variant.Id, Values(_color, "B")));
    }

    [Fact]
    public async Task Value_used_by_a_variant_cannot_be_removed_from_its_attribute()
    {
        await Generate(_shirt.Id, Values(_color, "R"));

        var blue = _color.Values.Single(v => v.Code == "B");
        var update = new UpdateProductAttributeCommand
        {
            Id = _color.Id, Code = "COLOR", Title = "رنگ", IsActive = true,
            Values = [new ProductAttributeValueInput { Id = blue.Id, Code = "B", Title = "آبی" }]
        };
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            new UpdateProductAttributeHandler(_db).Handle(update, default));
        Assert.Contains("قرمز", error.Message);
    }

    private Task<int> Generate(int productId, IEnumerable<int> valueIds) =>
        new GenerateProductVariantsHandler(_db).Handle(
            new GenerateProductVariantsCommand { ProductId = productId, AttributeValueIds = valueIds.ToList() }, default);

    private static IEnumerable<int> Values(ProductAttribute attribute, params string[] codes) =>
        codes.Select(c => attribute.Values.Single(v => v.Code == c).Id);

    private static ProductAttribute Attribute(string code, string title, params (string Code, string Title)[] values) => new()
    {
        Code = code,
        Title = title,
        Values = values.Select((v, i) => new ProductAttributeValue { Code = v.Code, Title = v.Title, SortOrder = i }).ToList()
    };
}
