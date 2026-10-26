using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Production.Queries.GetProductionOrders;
using ERPDotNet.Application.Modules.Production.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Production.Queries.GetProductionRequirements;

public record ProductionBomOptionDto(int Id, string Title, int Version, string Usage, bool IsMain, decimal BaseQuantity);

public record ProductionRequirementsDto(
    int BOMHeaderId,
    string BomTitle,
    int BomVersion,
    decimal BomBaseQuantity,
    List<ProductionOrderMaterialDto> Materials
);

/// <summary>فرمول‌های قابل انتخاب برای سفارش تولید یک کالا</summary>
public record GetProductionBomsQuery(int ProductId) : IRequest<List<ProductionBomOptionDto>>;

/// <summary>پیش‌نمایش نیاز مواد پیش از ثبت سفارش</summary>
public record GetProductionRequirementsQuery : IRequest<ProductionRequirementsDto>
{
    public int ProductId { get; set; }
    public int? BOMHeaderId { get; set; }
    public decimal Quantity { get; set; }
}

public class GetProductionRequirementsHandler :
    IRequestHandler<GetProductionBomsQuery, List<ProductionBomOptionDto>>,
    IRequestHandler<GetProductionRequirementsQuery, ProductionRequirementsDto>
{
    private readonly IApplicationDbContext _context;

    public GetProductionRequirementsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductionBomOptionDto>> Handle(GetProductionBomsQuery request, CancellationToken cancellationToken)
    {
        var boms = await ProductionRequirements.UsableBoms(_context, request.ProductId, DateTime.UtcNow)
            .AsNoTracking()
            .OrderBy(b => b.Usage).ThenByDescending(b => b.Version)
            .Select(b => new { b.Id, b.Title, b.Version, b.Usage, b.BaseQuantity })
            .ToListAsync(cancellationToken);

        return boms.Select((b, i) => new ProductionBomOptionDto(
            b.Id, b.Title, b.Version, b.Usage.ToDisplay(), i == 0, b.BaseQuantity)).ToList();
    }

    public async Task<ProductionRequirementsDto> Handle(GetProductionRequirementsQuery request, CancellationToken cancellationToken)
    {
        var bom = await ProductionRequirements.ResolveBomAsync(
            _context, request.ProductId, request.BOMHeaderId, DateTime.UtcNow, cancellationToken);
        var materials = ProductionRequirements.Explode(bom, request.Quantity > 0 ? request.Quantity : bom.BaseQuantity);

        var ids = materials.Select(m => m.ProductId).Distinct().ToList();
        var products = await _context.Products.AsNoTracking()
            .Where(p => ids.Contains(p.Id))
            .Select(p => new { p.Id, p.Code, p.Name, Unit = p.Unit != null ? p.Unit.Title : "" })
            .ToDictionaryAsync(p => p.Id, cancellationToken);

        return new ProductionRequirementsDto(
            bom.Id, bom.Title, bom.Version, bom.BaseQuantity,
            materials.Select(m =>
            {
                var p = products.GetValueOrDefault(m.ProductId);
                return new ProductionOrderMaterialDto(0, m.ProductId, p?.Code ?? "", p?.Name ?? "", p?.Unit ?? "",
                    m.StandardQuantity, m.WastePercentage, m.RequiredQuantity);
            }).ToList());
    }
}
