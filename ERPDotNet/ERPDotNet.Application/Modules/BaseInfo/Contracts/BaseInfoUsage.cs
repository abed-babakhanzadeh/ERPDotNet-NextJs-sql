using ERPDotNet.Application.Common.Exceptions;

namespace ERPDotNet.Application.Modules.BaseInfo.Contracts;

public static class BaseInfoUsage
{
    /// <summary>اولین ماژولی که رکورد را استفاده کرده باشد، حذف را با پیام خودش متوقف می‌کند</summary>
    public static async Task EnsureUnusedAsync(
        IEnumerable<IBaseInfoUsageChecker> checkers, BaseInfoReference kind, int id, CancellationToken cancellationToken)
    {
        foreach (var checker in checkers)
        {
            var usage = await checker.FindUsageAsync(kind, id, cancellationToken);
            if (usage != null) throw new BusinessRuleException(usage);
        }
    }
}
