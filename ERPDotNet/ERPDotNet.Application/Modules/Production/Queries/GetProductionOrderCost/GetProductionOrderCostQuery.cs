using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.Contracts;
using ERPDotNet.Application.Modules.Inventory.Services;
using ERPDotNet.Application.Modules.Production.Services;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Production.Queries.GetProductionOrderCost;

/// <summary>بهای خالص یک ماده در سفارش: حواله‌های قطعی‌شده منهای برگشت‌ها</summary>
public record MaterialCostLineDto(int ProductId, string ProductCode, string ProductName, string UnitName, decimal Quantity, decimal Cost);

/// <summary>بهای کارکرد یک عملیات: زمان آماده‌سازی و اجرای گزارش‌شده × نرخ ساعتی ثبت‌شده روی هر گزارش</summary>
public record OperationCostLineDto(int OperationId, int Sequence, string Title, string WorkCenterTitle, decimal Minutes, decimal Cost);

/// <param name="CostBasis">مبنای بهای محصول در تنظیمات ارزش‌گذاری (ProductionCostBasis)</param>
/// <param name="OrderCost">بهایی که طبق مبنا باید به رسیدهای محصول و ضایعات برسد</param>
/// <param name="ReceivedValue">ارزش قطعی‌شده رسیدهای محصول و ضایعات</param>
/// <param name="UnabsorbedCost">بهای سفارش که هنوز به هیچ رسیدی نرسیده (مثلاً حواله یا کارکرد بعد از آخرین رسید)</param>
/// <param name="UnitCost">ارزش رسیدها ÷ مقدار رسیدها؛ پیش از اولین رسید خالی است</param>
public record ProductionOrderCostDto(
    int OrderId,
    int CostBasis,
    decimal MaterialCost,
    decimal ConversionCost,
    decimal OrderCost,
    decimal OutputQuantity,
    decimal ScrapQuantity,
    decimal ReceivedValue,
    decimal UnabsorbedCost,
    decimal? UnitCost,
    List<MaterialCostLineDto> Materials,
    List<OperationCostLineDto> Operations
);

public record GetProductionOrderCostQuery(int OrderId) : IRequest<ProductionOrderCostDto>;

public class GetProductionOrderCostHandler : IRequestHandler<GetProductionOrderCostQuery, ProductionOrderCostDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IInventoryReferenceReader _inventory;

    public GetProductionOrderCostHandler(IApplicationDbContext context, IInventoryReferenceReader inventory)
    {
        _context = context;
        _inventory = inventory;
    }

    public async Task<ProductionOrderCostDto> Handle(GetProductionOrderCostQuery request, CancellationToken cancellationToken)
    {
        if (!await _context.ProductionOrders.AnyAsync(o => o.Id == request.OrderId, cancellationToken))
            throw new KeyNotFoundException("سفارش تولید یافت نشد.");

        var settings = await InventoryValuationSettingsReader.GetAsync(_context, cancellationToken);
        var posted = await _inventory.GetPostedCostsAsync(ProductionProgress.ReferenceName, request.OrderId, cancellationToken);

        static bool IsOutput(string? role) => role is ProductionProgress.OutputRole or ProductionProgress.ScrapRole;
        var receipts = posted.Where(l => l.Nature == InventoryNature.Input && IsOutput(l.LineRole)).ToList();

        // همان قاعده ارائه‌دهنده بهای رسید: حواله کاهش (منفی) و برگشت افزایش است
        var materialRows = posted
            .Where(l => l.Nature == InventoryNature.Output || (l.Nature == InventoryNature.Input && !IsOutput(l.LineRole)))
            .GroupBy(l => l.ProductId)
            .Select(g => (ProductId: g.Key, Quantity: -g.Sum(l => l.SignedQuantity), Cost: -g.Sum(l => l.SignedCost)))
            .Where(r => r.Quantity != 0 || r.Cost != 0)
            .ToList();
        var productIds = materialRows.Select(r => r.ProductId).ToList();
        var products = await _context.Products.AsNoTracking()
            .Where(p => productIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Code, p.Name, UnitName = p.Unit != null ? p.Unit.Title : "" })
            .ToDictionaryAsync(p => p.Id, cancellationToken);
        var materials = materialRows
            .Select(r => products.TryGetValue(r.ProductId, out var p)
                ? new MaterialCostLineDto(r.ProductId, p.Code, p.Name, p.UnitName, r.Quantity, Rial(r.Cost))
                : new MaterialCostLineDto(r.ProductId, "-", "-", "", r.Quantity, Rial(r.Cost)))
            .OrderBy(m => m.ProductCode)
            .ToList();

        var costs = await ProductionCosting.GetOperationCostsAsync(_context, request.OrderId, cancellationToken);
        var orderOperations = await _context.ProductionOrderOperations.AsNoTracking()
            .Where(o => o.ProductionOrderId == request.OrderId)
            .OrderBy(o => o.Sequence)
            .Select(o => new { o.Id, o.Sequence, o.Title, o.WorkCenterId })
            .ToListAsync(cancellationToken);
        // مرکز کاری حذف نرم‌شده هم در گزارش بها نامش دیده شود، چون کارکردش در بها هست
        var workCenterIds = orderOperations.Select(o => o.WorkCenterId).Distinct().ToList();
        var workCenters = await _context.WorkCenters.IgnoreQueryFilters().AsNoTracking()
            .Where(w => workCenterIds.Contains(w.Id))
            .ToDictionaryAsync(w => w.Id, w => w.Title, cancellationToken);
        var operations = orderOperations
            .Select(o =>
            {
                var title = workCenters.GetValueOrDefault(o.WorkCenterId, "-");
                return costs.TryGetValue(o.Id, out var c)
                    ? new OperationCostLineDto(o.Id, o.Sequence, o.Title, title, c.Minutes, Rial(c.Cost))
                    : new OperationCostLineDto(o.Id, o.Sequence, o.Title, title, 0, 0);
            })
            .ToList();

        var materialCost = materialRows.Sum(r => r.Cost);
        var conversionCost = costs.Values.Sum(c => c.Cost);
        var orderCost = settings.ProductionCostBasis == ProductionCostBasis.MaterialsAndWorkCenters ? materialCost + conversionCost : materialCost;
        var outputQuantity = receipts.Where(l => l.LineRole == ProductionProgress.OutputRole).Sum(l => l.SignedQuantity);
        var scrapQuantity = receipts.Where(l => l.LineRole == ProductionProgress.ScrapRole).Sum(l => l.SignedQuantity);
        var receivedValue = receipts.Sum(l => l.SignedCost);
        var receivedQuantity = outputQuantity + scrapQuantity;

        return new ProductionOrderCostDto(
            request.OrderId, (int)settings.ProductionCostBasis,
            Rial(materialCost), Rial(conversionCost), Rial(orderCost),
            outputQuantity, scrapQuantity, Rial(receivedValue), Rial(orderCost - receivedValue),
            receivedQuantity > 0 ? Math.Round(receivedValue / receivedQuantity, 2, MidpointRounding.AwayFromZero) : null,
            materials, operations);
    }

    private static decimal Rial(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
