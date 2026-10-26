using ERPDotNet.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Production.Services;

/// <summary>
/// بهای کارکرد (دستمزد و سربار) سفارش تولید: زمان آماده‌سازی و اجرای هر گزارش × نرخ ساعتی ثبت‌شده روی همان گزارش.
/// گزارش‌های حذف‌شده حساب نمی‌شوند.
/// </summary>
public static class ProductionCosting
{
    public sealed record OperationCost(int OperationId, decimal Minutes, decimal Cost);

    public static decimal CostOf(decimal minutes, decimal hourlyRate) => minutes * hourlyRate / 60m;

    /// <summary>بهای کارکرد هر عملیات سفارش؛ عملیات بدون گزارش در خروجی نیست</summary>
    public static async Task<Dictionary<int, OperationCost>> GetOperationCostsAsync(IApplicationDbContext context, int orderId, CancellationToken ct)
    {
        var reports = await context.ProductionOperationReports.AsNoTracking()
            .Where(r => r.Operation!.ProductionOrderId == orderId)
            .Select(r => new { r.ProductionOrderOperationId, Minutes = r.SetupMinutes + r.RunMinutes, r.HourlyRate })
            .ToListAsync(ct);

        return reports.GroupBy(r => r.ProductionOrderOperationId)
            .ToDictionary(g => g.Key, g => new OperationCost(g.Key, g.Sum(r => r.Minutes), g.Sum(r => CostOf(r.Minutes, r.HourlyRate))));
    }

    public static async Task<decimal> GetConversionCostAsync(IApplicationDbContext context, int orderId, CancellationToken ct) =>
        (await GetOperationCostsAsync(context, orderId, ct)).Values.Sum(c => c.Cost);
}
