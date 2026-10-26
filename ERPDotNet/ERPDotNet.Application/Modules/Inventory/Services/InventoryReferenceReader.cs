using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.Contracts;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Services;

public class InventoryReferenceReader : IInventoryReferenceReader
{
    private readonly IApplicationDbContext _context;

    public InventoryReferenceReader(IApplicationDbContext context)
    {
        _context = context;
    }

    public Task<List<ReferencedDocLine>> GetLinesAsync(string referenceEntityName, long referenceEntityId, CancellationToken cancellationToken) =>
        GetLinesAsync(referenceEntityName, [referenceEntityId], cancellationToken);

    // عمداً بدون فیلتر دسترسی انبار: جمع مقدارها برای سند مرجع باید کامل باشد
    public Task<List<ReferencedDocLine>> GetLinesAsync(string referenceEntityName, IReadOnlyCollection<long> referenceEntityIds, CancellationToken cancellationToken) =>
        _context.InventoryDocDetails
            .AsNoTracking()
            .Where(d => !d.IsDeleted && !d.Header!.IsDeleted
                && d.Header.ReferenceEntityName == referenceEntityName
                && d.Header.ReferenceEntityId != null
                && referenceEntityIds.Contains(d.Header.ReferenceEntityId.Value))
            .OrderBy(d => d.HeaderId).ThenBy(d => d.Id)
            .Select(d => new ReferencedDocLine(
                d.Header!.ReferenceEntityId!.Value,
                d.HeaderId,
                d.Header.DocNumber,
                d.Header.DocType!.Title,
                d.Header.DocType.Nature,
                d.Header.Status,
                d.Header.DocDate,
                d.Header.WarehouseId,
                d.Header.Warehouse!.Title,
                d.ProductId,
                d.MainUnitQuantity,
                d.ReferenceEntityName,
                d.ReferenceEntityLineId))
            .ToListAsync(cancellationToken);

    public async Task<List<ReferencedCostLine>> GetPostedCostsAsync(string referenceEntityName, long referenceEntityId, CancellationToken cancellationToken)
    {
        var rows = await (
                from t in _context.InventoryTransactions.AsNoTracking()
                join d in _context.InventoryDocDetails on t.DocDetailId equals d.Id
                join h in _context.InventoryDocHeaders on d.HeaderId equals h.Id
                where h.ReferenceEntityName == referenceEntityName && h.ReferenceEntityId == referenceEntityId
                select new { h.Id, h.DocType!.Nature, d.ProductId, d.ReferenceEntityName, t.Sign, t.Quantity, t.TotalCost })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(r => (r.Id, r.Nature, r.ProductId, r.ReferenceEntityName))
            .Select(g => new ReferencedCostLine(g.Key.Id, g.Key.Nature, g.Key.ProductId, g.Key.ReferenceEntityName,
                g.Sum(r => r.Quantity * (int)r.Sign), g.Sum(r => (r.TotalCost ?? 0) * (int)r.Sign)))
            .ToList();
    }
}
