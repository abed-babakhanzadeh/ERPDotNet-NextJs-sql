using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Production.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Production.Queries.GetProductionOrderOperations;

public record OperationReportDto(
    int Id,
    DateTime ReportDate,
    decimal GoodQuantity,
    decimal ScrapQuantity,
    decimal SetupMinutes,
    decimal RunMinutes,
    string? Note,
    string ReportedBy
);

/// <param name="EarnedMinutes">زمان استاندارد کار انجام‌شده (آماده‌سازی + اجرا به نسبت سالم و ضایعات)</param>
/// <param name="EfficiencyPercent">زمان استاندارد ÷ زمان واقعی؛ پیش از اولین گزارش خالی است</param>
/// <param name="RemainingMinutes">زمان برنامه‌ریزی‌شده باقی‌مانده برای مقدار سالمِ تولیدنشده</param>
public record ProductionOperationDto(
    int Id,
    int Sequence,
    string Title,
    int WorkCenterId,
    string WorkCenterCode,
    string WorkCenterTitle,
    decimal PlannedSetupMinutes,
    decimal PlannedRunMinutes,
    decimal GoodQuantity,
    decimal ScrapQuantity,
    decimal ActualSetupMinutes,
    decimal ActualRunMinutes,
    decimal EarnedMinutes,
    decimal? EfficiencyPercent,
    decimal RemainingMinutes,
    decimal ProgressPercent,
    List<OperationReportDto> Reports
);

public record GetProductionOrderOperationsQuery(int OrderId) : IRequest<List<ProductionOperationDto>>;

public class GetProductionOrderOperationsHandler : IRequestHandler<GetProductionOrderOperationsQuery, List<ProductionOperationDto>>
{
    private readonly IApplicationDbContext _context;

    public GetProductionOrderOperationsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductionOperationDto>> Handle(GetProductionOrderOperationsQuery request, CancellationToken cancellationToken)
    {
        var quantity = await _context.ProductionOrders.AsNoTracking()
            .Where(o => o.Id == request.OrderId)
            .Select(o => (decimal?)o.Quantity)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("سفارش تولید یافت نشد.");

        var operations = await _context.ProductionOrderOperations.AsNoTracking()
            .Where(o => o.ProductionOrderId == request.OrderId)
            .OrderBy(o => o.Sequence)
            .Select(o => new
            {
                o.Id, o.Sequence, o.Title, o.WorkCenterId,
                WorkCenterCode = o.WorkCenter!.Code, WorkCenterTitle = o.WorkCenter.Title,
                o.PlannedSetupMinutes, o.PlannedRunMinutes,
                Reports = o.Reports.OrderBy(r => r.ReportDate).ThenBy(r => r.Id)
                    .Select(r => new { r.Id, r.ReportDate, r.GoodQuantity, r.ScrapQuantity, r.SetupMinutes, r.RunMinutes, r.Note, r.CreatedBy })
                    .ToList()
            })
            .ToListAsync(cancellationToken);

        var userIds = operations.SelectMany(o => o.Reports).Select(r => r.CreatedBy).Where(id => id != null).Distinct().ToList();
        var names = await _context.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => (u.FirstName + " " + u.LastName).Trim(), cancellationToken);

        return operations.Select(o =>
        {
            var p = OperationProgress.Compute(o.PlannedSetupMinutes, o.PlannedRunMinutes, quantity,
                o.Reports.Select(r => new OperationProgress.Report(r.GoodQuantity, r.ScrapQuantity, r.SetupMinutes, r.RunMinutes)).ToList());
            return new ProductionOperationDto(o.Id, o.Sequence, o.Title, o.WorkCenterId, o.WorkCenterCode, o.WorkCenterTitle,
                o.PlannedSetupMinutes, o.PlannedRunMinutes, p.GoodQuantity, p.ScrapQuantity, p.ActualSetupMinutes, p.ActualRunMinutes,
                p.EarnedMinutes, p.EfficiencyPercent, p.RemainingMinutes, p.ProgressPercent,
                o.Reports.Select(r => new OperationReportDto(r.Id, r.ReportDate, r.GoodQuantity, r.ScrapQuantity, r.SetupMinutes, r.RunMinutes, r.Note,
                    r.CreatedBy != null && names.TryGetValue(r.CreatedBy, out var name) && name.Length > 0 ? name : r.CreatedBy ?? "-")).ToList());
        }).ToList();
    }
}
