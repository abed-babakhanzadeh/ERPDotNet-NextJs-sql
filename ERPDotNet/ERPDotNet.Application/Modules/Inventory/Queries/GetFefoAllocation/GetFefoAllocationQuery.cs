using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ERPDotNet.Application.Modules.Inventory.Services;

namespace ERPDotNet.Application.Modules.Inventory.Queries.GetFefoAllocation;

public record FefoLineDto(int BatchId, string BatchNumber, DateTime? ExpiryDate, int? LocationId, string? LocationCode, decimal Available, decimal Quantity);

public record FefoAllocationDto(List<FefoLineDto> Lines, decimal Shortage);

/// <summary>
/// پیشنهاد بچ برای خروج به روش FEFO: اول بچی که زودتر منقضی می‌شود.
/// بچ مسدود، تأییدنشده در QC و منقضی‌شده (تا تاریخ سند) پیشنهاد نمی‌شود؛ بچ بدون تاریخ انقضا آخر می‌آید.
/// </summary>
public record GetFefoAllocationQuery(int ProductId, int WarehouseId, decimal Quantity, DateTime? AsOfDate = null)
    : IRequest<FefoAllocationDto>, IWarehouseScopedRequest
{
    IEnumerable<int> IWarehouseScopedRequest.ScopedWarehouseIds => [WarehouseId];
}

public class GetFefoAllocationValidator : AbstractValidator<GetFefoAllocationQuery>
{
    public GetFefoAllocationValidator()
    {
        RuleFor(x => x.ProductId).GreaterThan(0);
        RuleFor(x => x.WarehouseId).GreaterThan(0);
        RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("مقدار درخواستی باید بیشتر از صفر باشد.");
    }
}

public class GetFefoAllocationHandler : IRequestHandler<GetFefoAllocationQuery, FefoAllocationDto>
{
    private readonly IApplicationDbContext _context;

    public GetFefoAllocationHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<FefoAllocationDto> Handle(GetFefoAllocationQuery request, CancellationToken cancellationToken)
    {
        var day = (request.AsOfDate ?? DateTime.UtcNow).Date;

        var candidates = await _context.CurrentStocks
            .AsNoTracking()
            .Where(s => s.ProductId == request.ProductId
                        && s.WarehouseId == request.WarehouseId
                        && s.BatchId != null
                        && s.QuantityOnHand - s.QuantityReserved > 0
                        && !s.Batch!.IsBlocked
                        && s.Batch.QcStatus == BatchQcStatus.Released
                        && (s.Batch.ExpiryDate == null || s.Batch.ExpiryDate >= day))
            .Select(s => new FefoLineDto(
                s.BatchId!.Value,
                s.Batch!.BatchNumber,
                s.Batch.ExpiryDate,
                s.LocationId,
                s.Location != null ? s.Location.Code : null,
                s.QuantityOnHand - s.QuantityReserved,
                0))
            .ToListAsync(cancellationToken);

        return Allocate(candidates, request.Quantity);
    }

    public static FefoAllocationDto Allocate(IEnumerable<FefoLineDto> candidates, decimal quantity)
    {
        var lines = new List<FefoLineDto>();
        var remaining = quantity;
        var ordered = candidates
            .OrderBy(c => c.ExpiryDate == null)
            .ThenBy(c => c.ExpiryDate)
            .ThenBy(c => c.BatchNumber)
            .ThenBy(c => c.LocationCode);

        foreach (var c in ordered)
        {
            if (remaining <= 0) break;
            var take = Math.Min(c.Available, remaining);
            lines.Add(c with { Quantity = take });
            remaining -= take;
        }

        return new FefoAllocationDto(lines, remaining);
    }
}
