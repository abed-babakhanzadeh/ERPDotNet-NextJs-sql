using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Production.Services;
using ERPDotNet.Domain.Modules.Production.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Production.Queries.GetWorkCenterLoad;

/// <param name="RemainingMinutes">زمان باقی‌مانده عملیات سفارش‌های تأییدشده و در حال تولید روی این مرکز</param>
/// <param name="LoadDays">باقی‌مانده ÷ ظرفیت روزانه؛ چند روز کاری کار در صف است</param>
public record WorkCenterLoadDto(
    int Id,
    string Code,
    string Title,
    decimal HoursPerDay,
    int OpenOrderCount,
    int OperationCount,
    decimal RemainingMinutes,
    decimal LoadDays
);

/// <summary>بار مراکز کاری فعال از سفارش‌های باز (بدون زمان‌بندی: کل کار در صف تقسیم بر ظرفیت روزانه)</summary>
public record GetWorkCenterLoadQuery : IRequest<List<WorkCenterLoadDto>>;

public class GetWorkCenterLoadHandler : IRequestHandler<GetWorkCenterLoadQuery, List<WorkCenterLoadDto>>
{
    private readonly IApplicationDbContext _context;

    public GetWorkCenterLoadHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<WorkCenterLoadDto>> Handle(GetWorkCenterLoadQuery request, CancellationToken cancellationToken)
    {
        var operations = await _context.ProductionOrderOperations.AsNoTracking()
            .Where(o => o.ProductionOrder!.Status == ProductionOrderStatus.Released || o.ProductionOrder.Status == ProductionOrderStatus.InProgress)
            .Select(o => new
            {
                o.WorkCenterId,
                o.ProductionOrderId,
                o.PlannedSetupMinutes,
                o.PlannedRunMinutes,
                o.ProductionOrder!.Quantity,
                Reports = o.Reports.Select(r => new OperationProgress.Report(r.GoodQuantity, r.ScrapQuantity, r.SetupMinutes, r.RunMinutes)).ToList()
            })
            .ToListAsync(cancellationToken);

        var byCenter = operations
            .Select(o => new
            {
                o.WorkCenterId,
                o.ProductionOrderId,
                Remaining = OperationProgress.Compute(o.PlannedSetupMinutes, o.PlannedRunMinutes, o.Quantity, o.Reports).RemainingMinutes
            })
            .Where(o => o.Remaining > 0)
            .GroupBy(o => o.WorkCenterId)
            .ToDictionary(g => g.Key, g => (Orders: g.Select(x => x.ProductionOrderId).Distinct().Count(), Operations: g.Count(), Minutes: g.Sum(x => x.Remaining)));

        var loaded = byCenter.Keys.ToList();
        var centers = await _context.WorkCenters.AsNoTracking()
            .Where(w => w.IsActive || loaded.Contains(w.Id))
            .OrderBy(w => w.Code)
            .Select(w => new { w.Id, w.Code, w.Title, w.HoursPerDay })
            .ToListAsync(cancellationToken);

        return centers.Select(w =>
        {
            var load = byCenter.GetValueOrDefault(w.Id);
            var capacity = w.HoursPerDay * 60;
            return new WorkCenterLoadDto(w.Id, w.Code, w.Title, w.HoursPerDay, load.Orders, load.Operations,
                // گرد کردن معمول (نه بانکی) برای عددی که کاربر می‌بیند
                Math.Round(load.Minutes, 1, MidpointRounding.AwayFromZero),
                capacity > 0 ? Math.Round(load.Minutes / capacity, 2, MidpointRounding.AwayFromZero) : 0);
        }).ToList();
    }
}
