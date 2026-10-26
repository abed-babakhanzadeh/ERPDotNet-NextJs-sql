using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Modules.Inventory.Commands.CreateInventoryDoc;
using ERPDotNet.Application.Modules.Inventory.Contracts;
using ERPDotNet.Application.Modules.Inventory.Services;
using ERPDotNet.Application.Modules.Production.Commands.ChangeProductionOrderStatus;
using ERPDotNet.Application.Modules.Production.Commands.ExecuteProductionOrder;
using ERPDotNet.Application.Modules.Production.Queries.GetProductionOrderProgress;
using ERPDotNet.Application.Modules.Production.Services;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using ERPDotNet.Domain.Modules.Production.Entities;
using ERPDotNet.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace ERPDotNet.Tests.Production;

// اجرای سفارش تولید: حواله مواد، رسید محصول و ضایعات، پیشرفت از روی اسناد انبار
public class ProductionExecutionTests : IDisposable
{
    private static readonly byte[] RowVersion = [1];

    private readonly AppDbContext _db = new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
        .Options);
    private readonly RecordingSender _sender = new();
    private readonly Product _cake, _flour, _sugar, _salt;
    private readonly int _input, _output, _warehouse;

    public ProductionExecutionTests()
    {
        _db.Units.Add(new ERPDotNet.Domain.Modules.BaseInfo.Entities.Unit { Id = 1, Title = "کیلوگرم", Symbol = "kg", RowVersion = RowVersion });
        _cake = NewProduct("CAKE");
        _flour = NewProduct("FLOUR");
        _sugar = NewProduct("SUGAR");
        _salt = NewProduct("SALT");
        _db.Products.AddRange(_cake, _flour, _sugar, _salt);
        var input = new InventoryDocType { Title = "رسید تولید", Nature = InventoryNature.Input, RowVersion = RowVersion };
        var output = new InventoryDocType { Title = "حواله تولید", Nature = InventoryNature.Output, RowVersion = RowVersion };
        var warehouse = new Warehouse { Title = "انبار مواد", Code = "W1", RowVersion = RowVersion };
        _db.InventoryDocTypes.AddRange(input, output);
        _db.Warehouses.Add(warehouse);
        _db.SaveChanges();
        (_input, _output, _warehouse) = (input.Id, output.Id, warehouse.Id);
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public void Posted_docs_are_done_open_docs_pending_and_void_docs_ignored()
    {
        var result = ProductionProgress.Compute(_cake.Id,
        [
            Line(InventoryNature.Output, InventoryDocStatus.Posted, _flour.Id, 5),
            Line(InventoryNature.Output, InventoryDocStatus.InProcess, _flour.Id, 2),
            Line(InventoryNature.Output, InventoryDocStatus.Cancelled, _flour.Id, 100),
            Line(InventoryNature.Output, InventoryDocStatus.Rejected, _flour.Id, 100),
            // برگشت مواد اضافه به انبار از مصرف کم می‌شود
            Line(InventoryNature.Input, InventoryDocStatus.Posted, _flour.Id, 1),
            Line(InventoryNature.Input, InventoryDocStatus.Posted, _cake.Id, 9, ProductionProgress.OutputRole),
            Line(InventoryNature.Input, InventoryDocStatus.Posted, _cake.Id, 1, ProductionProgress.ScrapRole),
            Line(InventoryNature.Input, InventoryDocStatus.Draft, _cake.Id, 3),
            Line(InventoryNature.Transfer, InventoryDocStatus.Posted, _flour.Id, 50),
        ]);

        Assert.Equal(new ProductionProgress.Quantity(4, 2), result.MaterialsByProduct[_flour.Id]);
        Assert.Equal(new ProductionProgress.Quantity(9, 3), result.Output);
        Assert.Equal(new ProductionProgress.Quantity(1, 0), result.Scrap);
        Assert.True(result.HasOpenDocs);
    }

    [Fact]
    public async Task Issue_needs_a_released_order_and_an_output_doc_type()
    {
        var order = await AddOrder(ProductionOrderStatus.Draft);
        var flour = order.Materials.First();

        await Assert.ThrowsAsync<BusinessRuleException>(() => Issue(order.Id, (flour.Id, 1)));

        order.Status = ProductionOrderStatus.Released;
        await _db.SaveChangesAsync();
        await Assert.ThrowsAsync<BusinessRuleException>(() => Issue(order.Id, _input, (flour.Id, 1)));
        await Assert.ThrowsAsync<BusinessRuleException>(() => Issue(order.Id, (flour.Id + 999, 1)));
        Assert.Empty(_sender.Docs);
    }

    [Fact]
    public async Task Issue_creates_a_draft_output_doc_traced_to_the_order_line_and_starts_production()
    {
        var order = await AddOrder(ProductionOrderStatus.Released);
        var flour = order.Materials.Single(m => m.ProductId == _flour.Id);

        var docId = await Issue(order.Id, (flour.Id, 4.5m));

        var doc = Assert.Single(_sender.Docs);
        Assert.Equal(1001, docId);
        Assert.Equal((_output, _warehouse), (doc.DocTypeId, doc.WarehouseId));
        Assert.Equal((ProductionProgress.ReferenceName, (long?)order.Id, order.OrderNumber),
            (doc.ReferenceEntityName, doc.ReferenceEntityId, doc.ReferenceExternalCode));
        var line = Assert.Single(doc.Details);
        Assert.Equal((_flour.Id, 4.5m, 7, ProductionProgress.MaterialRole, (long?)flour.Id),
            (line.ProductId, line.MainUnitQuantity, line.LocationId, line.ReferenceEntityName, line.ReferenceEntityLineId));
        Assert.Equal(ProductionOrderStatus.InProgress, (await _db.ProductionOrders.FindAsync(order.Id))!.Status);
    }

    [Fact]
    public async Task Receipt_has_separate_good_and_scrap_lines_of_the_order_product()
    {
        var order = await AddOrder(ProductionOrderStatus.InProgress);

        await Receive(order.Id, new ReceiveProductionOutputCommand { Quantity = 9, ScrapQuantity = 1, ScrapLocationId = 8 });
        await Receive(order.Id, new ReceiveProductionOutputCommand { Quantity = 0, ScrapQuantity = 2 });

        var first = _sender.Docs[0].Details;
        Assert.Equal([(9m, 7, ProductionProgress.OutputRole), (1m, 8, ProductionProgress.ScrapRole)],
            first.Select(d => (d.MainUnitQuantity, d.LocationId, d.ReferenceEntityName!)));
        Assert.All(first, d => Assert.Equal(_cake.Id, d.ProductId));
        // قفسه ضایعات در صورت خالی بودن، همان قفسه محصول است
        Assert.Equal((2m, 7), (_sender.Docs[1].Details.Single().MainUnitQuantity, _sender.Docs[1].Details.Single().LocationId));
    }

    [Fact]
    public async Task Progress_reads_quantities_from_the_inventory_docs_of_the_order()
    {
        var order = await AddOrder(ProductionOrderStatus.InProgress);
        var flour = order.Materials.Single(m => m.ProductId == _flour.Id);
        await AddDoc(order.Id, _output, InventoryDocStatus.Posted, (_flour.Id, 3, ProductionProgress.MaterialRole));
        await AddDoc(order.Id, _output, InventoryDocStatus.Draft, (_flour.Id, 1, ProductionProgress.MaterialRole), (_salt.Id, 0.5m, null));
        await AddDoc(order.Id, _output, InventoryDocStatus.Cancelled, (_sugar.Id, 50, ProductionProgress.MaterialRole));
        await AddDoc(order.Id, _input, InventoryDocStatus.Posted, (_cake.Id, 8, ProductionProgress.OutputRole), (_cake.Id, 2, ProductionProgress.ScrapRole));
        await AddDoc(order.Id + 1, _output, InventoryDocStatus.Posted, (_flour.Id, 99, ProductionProgress.MaterialRole));

        var progress = await new GetProductionOrderProgressHandler(_db, Reader()).Handle(new GetProductionOrderProgressQuery(order.Id), default);

        var row = progress.Materials.Single(m => m.MaterialId == flour.Id);
        Assert.Equal((10.5m, 3m, 1m, 6.5m), (row.RequiredQuantity, row.IssuedQuantity, row.PendingIssueQuantity, row.RemainingQuantity));
        var sugar = progress.Materials.Single(m => m.ProductId == _sugar.Id);
        Assert.Equal((0m, 5m), (sugar.IssuedQuantity, sugar.RemainingQuantity));
        // ماده خارج از فرمول هم دیده می‌شود
        var salt = progress.Materials.Single(m => m.ProductId == _salt.Id);
        Assert.Equal(((int?)null, 0m, 0.5m), (salt.MaterialId, salt.RequiredQuantity, salt.PendingIssueQuantity));
        Assert.Equal((8m, 2m, true), (progress.ReceivedQuantity, progress.ScrapQuantity, progress.HasOpenDocs));
        Assert.Equal(4, progress.Documents.Count);
    }

    [Fact]
    public async Task Completion_needs_posted_output_and_no_open_docs()
    {
        var order = await AddOrder(ProductionOrderStatus.InProgress);
        var complete = () => Handler().Handle(new CompleteProductionOrderCommand(order.Id), default);

        await Assert.ThrowsAsync<BusinessRuleException>(complete);
        var draft = await AddDoc(order.Id, _input, InventoryDocStatus.Draft, (_cake.Id, 10, ProductionProgress.OutputRole));
        await Assert.ThrowsAsync<BusinessRuleException>(complete);

        draft.Status = InventoryDocStatus.Posted;
        await _db.SaveChangesAsync();
        Assert.True(await complete());
        Assert.Equal(ProductionOrderStatus.Completed, (await _db.ProductionOrders.FindAsync(order.Id))!.Status);
        await Assert.ThrowsAsync<BusinessRuleException>(() => Receive(order.Id, new ReceiveProductionOutputCommand { Quantity = 1 }));
    }

    [Fact]
    public async Task In_progress_order_is_cancelled_only_when_all_its_docs_are_void()
    {
        var order = await AddOrder(ProductionOrderStatus.InProgress);
        var doc = await AddDoc(order.Id, _output, InventoryDocStatus.Posted, (_flour.Id, 3, ProductionProgress.MaterialRole));
        var status = new ChangeProductionOrderStatusHandler(_db, Reader());

        await Assert.ThrowsAsync<BusinessRuleException>(() => status.Handle(new CancelProductionOrderCommand(order.Id), default));

        doc.Status = InventoryDocStatus.Cancelled;
        await _db.SaveChangesAsync();
        await status.Handle(new CancelProductionOrderCommand(order.Id), default);
        Assert.Equal(ProductionOrderStatus.Cancelled, (await _db.ProductionOrders.FindAsync(order.Id))!.Status);
    }

    private Task<long> Issue(int orderId, params (int MaterialId, decimal Quantity)[] lines) => Issue(orderId, _output, lines);

    private Task<long> Issue(int orderId, int docTypeId, params (int MaterialId, decimal Quantity)[] lines) =>
        Handler().Handle(new IssueProductionMaterialsCommand
        {
            Id = orderId,
            DocTypeId = docTypeId,
            WarehouseId = _warehouse,
            LocationId = 7,
            Lines = lines.Select(l => new IssueProductionMaterialLine { MaterialId = l.MaterialId, Quantity = l.Quantity }).ToList()
        }, default);

    private Task<long> Receive(int orderId, ReceiveProductionOutputCommand command) =>
        Handler().Handle(command with { Id = orderId, DocTypeId = _input, WarehouseId = _warehouse, LocationId = 7 }, default);

    private ProductionExecutionHandler Handler() => new(_db, _sender, Reader());

    private InventoryReferenceReader Reader() => new(_db);

    private async Task<ProductionOrder> AddOrder(ProductionOrderStatus status)
    {
        var bom = new BOMHeader { ProductId = _cake.Id, Title = "BOM", Version = 1, BaseQuantity = 1, FromDate = DateTime.UtcNow };
        _db.BOMHeaders.Add(bom);
        await _db.SaveChangesAsync();
        var order = new ProductionOrder
        {
            OrderNumber = $"MO-{bom.Id:D5}",
            ProductId = _cake.Id,
            BOMHeaderId = bom.Id,
            Quantity = 10,
            Status = status,
            Materials =
            {
                new ProductionOrderMaterial { ProductId = _flour.Id, StandardQuantity = 10, WastePercentage = 5, RequiredQuantity = 10.5m },
                new ProductionOrderMaterial { ProductId = _sugar.Id, StandardQuantity = 5, RequiredQuantity = 5 },
            }
        };
        _db.ProductionOrders.Add(order);
        await _db.SaveChangesAsync();
        return order;
    }

    private async Task<InventoryDocHeader> AddDoc(int orderId, int docTypeId, InventoryDocStatus status,
        params (int ProductId, decimal Quantity, string? Role)[] lines)
    {
        var doc = new InventoryDocHeader
        {
            DocTypeId = docTypeId,
            WarehouseId = _warehouse,
            Status = status,
            ReferenceEntityName = ProductionProgress.ReferenceName,
            ReferenceEntityId = orderId,
            RowVersion = RowVersion,
            Details = lines.Select(l => new InventoryDocDetail
            {
                ProductId = l.ProductId,
                MainUnitQuantity = l.Quantity,
                ReferenceEntityName = l.Role,
                RowVersion = RowVersion
            }).ToList()
        };
        _db.InventoryDocHeaders.Add(doc);
        await _db.SaveChangesAsync();
        return doc;
    }

    private static ReferencedDocLine Line(InventoryNature nature, InventoryDocStatus status, int productId, decimal quantity, string? role = null) =>
        new(1, 1, "", nature, status, DateTime.UtcNow, 1, "", productId, quantity, role, null);

    private static Product NewProduct(string code) =>
        new() { Code = code, Name = code, UnitId = 1, SupplyType = ProductSupplyType.Manufactured };

    // سند واقعی را CreateInventoryDocHandler می‌سازد؛ اینجا فقط فرمان ارسالی بررسی می‌شود
    private sealed class RecordingSender : ISender
    {
        public List<CreateInventoryDocCommand> Docs { get; } = new();

        public Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken cancellationToken = default)
        {
            Docs.Add((CreateInventoryDocCommand)(object)request);
            return Task.FromResult((TResponse)(object)(long)(1000 + Docs.Count));
        }

        public Task Send<TRequest>(TRequest request, CancellationToken cancellationToken = default) where TRequest : IRequest =>
            throw new NotSupportedException();

        public Task<object?> Send(object request, CancellationToken cancellationToken = default) => throw new NotSupportedException();

        public IAsyncEnumerable<TResponse> CreateStream<TResponse>(IStreamRequest<TResponse> request, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public IAsyncEnumerable<object?> CreateStream(object request, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();
    }
}
