using ERPDotNet.Application.Modules.Inventory.Commands.CreateInventoryDoc;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using ERPDotNet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Tests.Inventory;

public class InventoryDocLocationRuleTests : IDisposable
{
    private const int Source = 1, Destination = 2;
    private const int SourceShelf = 10, DestinationShelf = 20;

    private readonly AppDbContext _db;
    private readonly int _receiptTypeId, _transferTypeId;

    public InventoryDocLocationRuleTests()
    {
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        _db.Locations.AddRange(
            new Location { Id = SourceShelf, WarehouseId = Source, Code = "A1", RowVersion = [1] },
            new Location { Id = DestinationShelf, WarehouseId = Destination, Code = "B1", RowVersion = [1] });
        var receipt = new InventoryDocType { Title = "رسید", Nature = InventoryNature.Input, RowVersion = [1] };
        var transfer = new InventoryDocType { Title = "انتقال", Nature = InventoryNature.Transfer, RowVersion = [1] };
        _db.InventoryDocTypes.AddRange(receipt, transfer);
        _db.SaveChanges();
        (_receiptTypeId, _transferTypeId) = (receipt.Id, transfer.Id);
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Valid_transfer_passes()
    {
        var result = await Validate(_transferTypeId, Destination, SourceShelf, DestinationShelf);

        Assert.True(result.IsValid, string.Join(" | ", result.Errors));
    }

    [Fact]
    public async Task Line_location_from_another_warehouse_is_rejected()
    {
        var result = await Validate(_receiptTypeId, null, DestinationShelf, null);

        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("سطر 1") && e.ErrorMessage.Contains("انبار سند"));
    }

    [Fact]
    public async Task Transfer_line_without_destination_location_is_rejected()
    {
        var result = await Validate(_transferTypeId, Destination, SourceShelf, null);

        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("لوکیشن مقصد را انتخاب کنید"));
    }

    [Fact]
    public async Task Transfer_destination_location_must_belong_to_destination_warehouse()
    {
        var result = await Validate(_transferTypeId, Destination, SourceShelf, SourceShelf);

        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("متعلق به انبار مقصد نیست"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData(Source)]
    public async Task Transfer_requires_a_different_destination_warehouse(int? destinationWarehouse)
    {
        var result = await Validate(_transferTypeId, destinationWarehouse, SourceShelf, DestinationShelf);

        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("انبار مقصد الزامی"));
    }

    private Task<FluentValidation.Results.ValidationResult> Validate(int docTypeId, int? destinationWarehouse, int location, int? destinationLocation) =>
        new CreateInventoryDocValidator(_db).ValidateAsync(new CreateInventoryDocCommand
        {
            DocTypeId = docTypeId,
            WarehouseId = Source,
            DestinationWarehouseId = destinationWarehouse,
            Details = { new CreateInventoryDocDetailDto { ProductId = 1, MainUnitQuantity = 1, LocationId = location, DestinationLocationId = destinationLocation } }
        });
}
