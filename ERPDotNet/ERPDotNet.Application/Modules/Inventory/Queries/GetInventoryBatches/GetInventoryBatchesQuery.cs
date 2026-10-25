using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Application.Modules.Inventory.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Queries.GetBatches;

public record GetInventoryBatchesQuery(int ProductId, bool IncludeBlocked = false) : IRequest<List<InventoryBatchDto>>;

public class GetInventoryBatchesHandler : IRequestHandler<GetInventoryBatchesQuery, List<InventoryBatchDto>>
{
    private readonly IApplicationDbContext _context;

    public GetInventoryBatchesHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<InventoryBatchDto>> Handle(GetInventoryBatchesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.InventoryBatches
            .AsNoTracking()
            .Where(x => x.ProductId == request.ProductId && !x.IsDeleted);

        if (!request.IncludeBlocked)
        {
            query = query.Where(x => !x.IsBlocked);
        }

        // مرتب‌سازی: اول تاریخ انقضا نزدیک‌تر، بعد شماره بچ
        query = query.OrderBy(x => x.ExpiryDate).ThenBy(x => x.BatchNumber);

        var batches = await query.Select(x => new InventoryBatchDto
        {
            Id = x.Id,
            ProductId = x.ProductId,
            BatchNumber = x.BatchNumber,
            ManufactureDate = x.ManufactureDate,
            ExpiryDate = x.ExpiryDate,
            SupplierBatchCode = x.SupplierBatchCode,
            Description = x.Description,
            IsBlocked = x.IsBlocked,
            BlockReason = x.BlockReason,
            QcStatus = (int)x.QcStatus,
            QcNote = x.QcNote,
            QcCheckedAt = x.QcCheckedAt,
            RowVersion = Convert.ToBase64String(x.RowVersion!)
        }).ToListAsync(cancellationToken);

        batches.ForEach(b => b.QcStatusTitle = ((BatchQcStatus)b.QcStatus).ToDisplay());
        return batches;
    }
}