using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Modules.BaseInfo.Commands.CreateProduct;
using ERPDotNet.Application.Modules.BaseInfo.Commands.DeleteProductCategory;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using ERPDotNet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Tests.BaseInfo;

public class ProductCategoryTests : IDisposable
{
    private static readonly byte[] RowVersion = [1];
    private readonly AppDbContext _db =
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Category_used_by_a_product_cannot_be_deleted()
    {
        var category = await AddCategory("C1");
        await AddProduct("P1", categoryId: category.Id, barcode: null);

        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            new DeleteProductCategoryHandler(_db).Handle(new DeleteProductCategoryCommand(category.Id), default));
    }

    [Fact]
    public async Task Unused_category_is_soft_deleted()
    {
        var category = await AddCategory("C1");

        await new DeleteProductCategoryHandler(_db).Handle(new DeleteProductCategoryCommand(category.Id), default);

        Assert.False(await _db.ProductCategories.AnyAsync());
    }

    [Fact]
    public async Task Duplicate_barcode_and_malformed_tax_code_are_rejected()
    {
        await AddProduct("P1", categoryId: null, barcode: "6260000000017");

        var result = await new CreateProductValidator(_db).ValidateAsync(new CreateProductCommand
        {
            Code = "P2",
            Name = "P2",
            UnitId = 1,
            Barcode = "6260000000017",
            TaxCode = "12345",
            CategoryId = 999,
        });

        Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateProductCommand.Barcode));
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateProductCommand.TaxCode));
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateProductCommand.CategoryId));
    }

    [Fact]
    public async Task Valid_optional_fields_pass_validation()
    {
        var category = await AddCategory("C1");

        var result = await new CreateProductValidator(_db).ValidateAsync(new CreateProductCommand
        {
            Code = "P2",
            Name = "P2",
            UnitId = 1,
            Barcode = "6260000000024",
            TaxCode = "2710000000013",
            CategoryId = category.Id,
        });

        Assert.True(result.IsValid, string.Join(", ", result.Errors));
    }

    private async Task<ProductCategory> AddCategory(string code)
    {
        var category = new ProductCategory { Code = code, Title = code, RowVersion = RowVersion };
        _db.ProductCategories.Add(category);
        await _db.SaveChangesAsync();
        return category;
    }

    private async Task AddProduct(string code, int? categoryId, string? barcode)
    {
        _db.Products.Add(new Product
        {
            Code = code,
            Name = code,
            UnitId = 1,
            SupplyType = ProductSupplyType.Purchased,
            CategoryId = categoryId,
            Barcode = barcode,
            RowVersion = RowVersion,
        });
        await _db.SaveChangesAsync();
    }
}
