using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.Contracts;
using ERPDotNet.Application.Modules.Production.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Production.Queries.GetProductionOrderProgress;

/// <param name="MaterialId">سطر نیاز مواد سفارش؛ برای ماده‌ای که خارج از فرمول صادر شده خالی است</param>
/// <param name="RemainingQuantity">نیاز منهای صادرشده و در جریان (حداقل صفر)؛ پیش‌فرض حواله بعدی</param>
/// <param name="StandardForOutput">مصرف استاندارد فرمول برای مقدار تولیدشده (بدون ضایعات فرمول)</param>
/// <param name="AllowedForOutput">مصرف مجاز برای مقدار تولیدشده (با ضایعات فرمول)</param>
/// <param name="VarianceQuantity">مصرف قطعی منهای استاندارد؛ مثبت یعنی اضافه‌مصرف</param>
/// <param name="VariancePercent">انحراف نسبت به استاندارد؛ برای ماده خارج از فرمول یا پیش از تولید خالی است</param>
public record ProductionMaterialProgressDto(
    int? MaterialId,
    int ProductId,
    string ProductCode,
    string ProductName,
    string UnitName,
    decimal RequiredQuantity,
    decimal IssuedQuantity,
    decimal PendingIssueQuantity,
    decimal RemainingQuantity,
    decimal StandardForOutput,
    decimal AllowedForOutput,
    decimal VarianceQuantity,
    decimal? VariancePercent,
    bool OverAllowed
);

public record ProductionLinkedDocDto(
    long DocId,
    long DocNumber,
    string DocTypeTitle,
    int NatureId,
    string NatureTitle,
    int StatusId,
    string StatusTitle,
    DateTime DocDate,
    string WarehouseName
);

public record ProductionOrderProgressDto(
    decimal OrderQuantity,
    decimal ReceivedQuantity,
    decimal PendingReceiptQuantity,
    decimal ScrapQuantity,
    decimal PendingScrapQuantity,
    // مبنای انحراف مواد: محصول سالم + ضایعات قطعی
    decimal ProducedQuantity,
    decimal? YieldPercent,
    bool HasOpenDocs,
    List<ProductionMaterialProgressDto> Materials,
    List<ProductionLinkedDocDto> Documents
);

public record GetProductionOrderProgressQuery(int Id) : IRequest<ProductionOrderProgressDto>;

public class GetProductionOrderProgressHandler : IRequestHandler<GetProductionOrderProgressQuery, ProductionOrderProgressDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IInventoryReferenceReader _inventory;

    public GetProductionOrderProgressHandler(IApplicationDbContext context, IInventoryReferenceReader inventory)
    {
        _context = context;
        _inventory = inventory;
    }

    public async Task<ProductionOrderProgressDto> Handle(GetProductionOrderProgressQuery request, CancellationToken cancellationToken)
    {
        var order = await _context.ProductionOrders
            .AsNoTracking()
            .Where(o => o.Id == request.Id)
            .Select(o => new { o.Id, o.ProductId, o.Quantity })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("سفارش تولید یافت نشد.");

        var lines = await _inventory.GetLinesAsync(ProductionProgress.ReferenceName, order.Id, cancellationToken);
        var progress = ProductionProgress.Compute(order.ProductId, lines);

        var planned = await _context.ProductionOrderMaterials
            .AsNoTracking()
            .Where(m => m.ProductionOrderId == order.Id)
            .OrderBy(m => m.Id)
            .Select(m => new ProductionProgress.PlannedMaterial(m.Id, m.ProductId, m.StandardQuantity, m.RequiredQuantity))
            .ToListAsync(cancellationToken);
        var materials = ProductionProgress.Materials(planned, progress, order.Quantity);

        var productIds = materials.Select(m => m.ProductId).Distinct().ToList();
        var products = await _context.Products
            .AsNoTracking()
            .Where(p => productIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Code, p.Name, UnitName = p.Unit != null ? p.Unit.Title : "" })
            .ToDictionaryAsync(p => p.Id, cancellationToken);

        var rows = materials.Select(m =>
        {
            var p = products[m.ProductId];
            return new ProductionMaterialProgressDto(m.MaterialId, m.ProductId, p.Code, p.Name, p.UnitName,
                m.RequiredQuantity, m.Issued.Done, m.Issued.Pending, m.RemainingQuantity,
                m.StandardForOutput, m.AllowedForOutput, m.VarianceQuantity, m.VariancePercent, m.OverAllowed);
        }).ToList();

        var documents = lines
            .GroupBy(l => l.DocId)
            .Select(g => g.First())
            .Select(l => new ProductionLinkedDocDto(l.DocId, l.DocNumber, l.DocTypeTitle,
                (int)l.Nature, l.Nature.ToDisplay(), (int)l.Status, l.Status.ToDisplay(), l.DocDate, l.WarehouseName))
            .ToList();

        return new ProductionOrderProgressDto(
            order.Quantity,
            progress.Output.Done, progress.Output.Pending,
            progress.Scrap.Done, progress.Scrap.Pending,
            ProductionProgress.Produced(progress),
            ProductionProgress.YieldPercent(progress),
            progress.HasOpenDocs,
            rows,
            documents);
    }
}
