namespace ERPDotNet.Application.Modules.Production.Services;

/// <summary>
/// پیشرفت و کارایی یک عملیات سفارش از روی گزارش‌های کارکرد.
/// زمان استاندارد کار انجام‌شده = آماده‌سازی برنامه (اگر شروع شده) + اجرای برنامه × (سالم + ضایعات) ÷ مقدار سفارش.
/// کارایی = زمان استاندارد کار انجام‌شده ÷ زمان واقعی.
/// </summary>
public static class OperationProgress
{
    public sealed record Report(decimal GoodQuantity, decimal ScrapQuantity, decimal SetupMinutes, decimal RunMinutes);

    public sealed record Result(
        decimal GoodQuantity,
        decimal ScrapQuantity,
        decimal ActualSetupMinutes,
        decimal ActualRunMinutes,
        decimal EarnedMinutes,
        decimal? EfficiencyPercent,
        decimal RemainingMinutes,
        decimal ProgressPercent)
    {
        public decimal ActualMinutes => ActualSetupMinutes + ActualRunMinutes;
    }

    public static Result Compute(decimal plannedSetup, decimal plannedRun, decimal orderQuantity, IReadOnlyCollection<Report> reports)
    {
        var good = reports.Sum(r => r.GoodQuantity);
        var scrap = reports.Sum(r => r.ScrapQuantity);
        var setup = reports.Sum(r => r.SetupMinutes);
        var run = reports.Sum(r => r.RunMinutes);
        var started = reports.Count > 0;
        var done = orderQuantity > 0 ? (good + scrap) / orderQuantity : 0;

        var earned = (started ? plannedSetup : 0) + plannedRun * done;
        var actual = setup + run;
        // باقی‌مانده فقط برای مقدار سالمِ هنوز تولیدنشده است
        var remainingShare = orderQuantity > 0 ? Math.Max(0, orderQuantity - good) / orderQuantity : 0;
        var remaining = (started ? 0 : plannedSetup) + plannedRun * remainingShare;

        const MidpointRounding away = MidpointRounding.AwayFromZero;
        return new Result(good, scrap, setup, run,
            Math.Round(earned, 2, away),
            actual > 0 ? Math.Round(earned / actual * 100, 1, away) : null,
            Math.Round(remaining, 2, away),
            orderQuantity > 0 ? Math.Round(Math.Min(good / orderQuantity, 1) * 100, 1, away) : 0);
    }
}
