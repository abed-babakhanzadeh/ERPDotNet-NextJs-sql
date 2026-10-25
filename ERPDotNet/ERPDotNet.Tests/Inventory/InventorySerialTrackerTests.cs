using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Modules.Inventory.Services;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using ERPDotNet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Tests.Inventory;

public class InventorySerialTrackerTests : IDisposable
{
    private const int Serialized = 100;
    private const int Plain = 101;
    private const int Source = 1;
    private const int Destination = 2;

    private readonly AppDbContext _db =
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    public InventorySerialTrackerTests()
    {
        _db.Products.AddRange(
            new Product { Id = Serialized, Code = "LAP", Name = "لپ‌تاپ", UnitId = 1, SupplyType = ProductSupplyType.Purchased },
            new Product { Id = Plain, Code = "SCR", Name = "پیچ", UnitId = 1, SupplyType = ProductSupplyType.Purchased });
        _db.InventoryItemProfiles.Add(new InventoryItemProfile { ProductId = Serialized, IsSerialManaged = true, MainInventoryUnitId = 1 });
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Receipt_puts_new_serials_in_stock_at_the_line_location()
    {
        var doc = Doc(Line(Serialized, location: 7, "S1", "S2"));

        await Apply(doc, InventoryNature.Input);

        var serials = await _db.InventorySerials.OrderBy(s => s.SerialNumber).ToListAsync();
        Assert.Equal(["S1", "S2"], serials.Select(s => s.SerialNumber));
        Assert.All(serials, s =>
        {
            Assert.Equal(InventorySerialStatus.InStock, s.Status);
            Assert.Equal(Source, s.WarehouseId);
            Assert.Equal(7, s.LocationId);
        });
    }

    [Fact]
    public async Task Serial_count_must_match_the_line_quantity()
    {
        var doc = Doc(Line(Serialized, location: 7, "S1"));
        doc.Details.Single().MainUnitQuantity = 2;

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => Apply(doc, InventoryNature.Input));

        Assert.Contains("تعداد سریال‌ها (1)", error.Message);
    }

    [Fact]
    public async Task Serials_on_a_non_serialized_product_are_rejected()
    {
        var doc = Doc(Line(Plain, location: 7, "X1"));

        await Assert.ThrowsAsync<BusinessRuleException>(() => Apply(doc, InventoryNature.Input));
    }

    [Fact]
    public async Task A_serial_already_in_stock_cannot_be_received_again()
    {
        await Apply(Doc(Line(Serialized, location: 7, "S1")), InventoryNature.Input);

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Apply(Doc(Line(Serialized, location: 7, "S1")), InventoryNature.Input));

        Assert.Contains("همین حالا در انبار است", error.Message);
    }

    [Fact]
    public async Task Issue_requires_the_serial_in_the_source_warehouse_and_takes_it_out()
    {
        await Apply(Doc(Line(Serialized, location: 7, "S1")), InventoryNature.Input);

        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Apply(Doc(Line(Serialized, location: 7, "UNKNOWN")), InventoryNature.Output));

        await Apply(Doc(Line(Serialized, location: 7, "S1")), InventoryNature.Output);
        var serial = await _db.InventorySerials.SingleAsync();
        Assert.Equal(InventorySerialStatus.OutOfStock, serial.Status);
        Assert.Null(serial.WarehouseId);
    }

    [Fact]
    public async Task Transfer_moves_the_serial_and_its_reversal_moves_it_back()
    {
        await Apply(Doc(Line(Serialized, location: 7, "S1")), InventoryNature.Input);
        var transfer = Doc(Line(Serialized, location: 7, "S1", destinationLocation: 9));
        transfer.DestinationWarehouseId = Destination;

        await Apply(transfer, InventoryNature.Transfer);
        var moved = await _db.InventorySerials.SingleAsync();
        Assert.Equal((Destination, 9), (moved.WarehouseId!.Value, moved.LocationId!.Value));

        await Apply(transfer, InventoryNature.Transfer, isReversal: true);
        var back = await _db.InventorySerials.SingleAsync();
        Assert.Equal((Source, 7), (back.WarehouseId!.Value, back.LocationId!.Value));
    }

    [Fact]
    public async Task Reverting_a_receipt_fails_once_the_serial_has_left_the_warehouse()
    {
        var receipt = Doc(Line(Serialized, location: 7, "S1"));
        await Apply(receipt, InventoryNature.Input);
        await Apply(Doc(Line(Serialized, location: 7, "S1")), InventoryNature.Output);

        await Assert.ThrowsAsync<BusinessRuleException>(() => Apply(receipt, InventoryNature.Input, isReversal: true));
    }

    private async Task Apply(InventoryDocHeader doc, InventoryNature nature, bool isReversal = false)
    {
        await InventorySerialTracker.ApplyAsync(_db, doc, nature, isReversal, default);
        await _db.SaveChangesAsync();
    }

    private static InventoryDocHeader Doc(InventoryDocDetail line) =>
        new() { Id = 1, DocTypeId = 1, WarehouseId = Source, Details = { line } };

    private static InventoryDocDetail Line(int productId, int location, string serial, int? destinationLocation = null) =>
        Line(productId, location, [serial], destinationLocation);

    private static InventoryDocDetail Line(int productId, int location, string s1, string s2) =>
        Line(productId, location, [s1, s2], null);

    private static InventoryDocDetail Line(int productId, int location, string[] serials, int? destinationLocation)
    {
        var line = new InventoryDocDetail
        {
            ProductId = productId,
            MainUnitQuantity = serials.Length,
            LocationId = location,
            DestinationLocationId = destinationLocation,
        };
        foreach (var serial in serials) line.Serials.Add(new InventoryDocDetailSerial { SerialNumber = serial });
        return line;
    }
}
