namespace ERPDotNet.Application.Modules.BaseInfo.Contracts;

/// <summary>
/// قرارداد سال مالی برای ماژول‌های دیگر؛ آن‌ها فقط شناسه سال را نگه می‌دارند و قواعد را از اینجا می‌گیرند.
/// </summary>
public interface IFiscalYearService
{
    /// <summary>
    /// سال مالی باز شامل تاریخ را برمی‌گرداند. اگر هنوز هیچ سال مالی تعریف نشده باشد null است
    /// (سازگاری با داده‌های پیش از تعریف سال مالی)، وگرنه نبودِ سال باز خطای قاعده کسب‌وکار است.
    /// </summary>
    /// <param name="companyId">شرکت صاحب سند؛ null یعنی سال‌های همه شرکت‌ها</param>
    Task<int?> ResolveOpenYearAsync(int? companyId, DateTime date, CancellationToken cancellationToken);

    /// <summary>اگر سال مالی بسته باشد خطای قاعده کسب‌وکار می‌دهد</summary>
    Task EnsureOpenAsync(int? fiscalYearId, CancellationToken cancellationToken);
}
