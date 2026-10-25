namespace ERPDotNet.Application.Modules.BaseInfo.Contracts;

public enum BaseInfoReference
{
    Company = 1,
    FiscalYear = 2,
    CostCenter = 3
}

/// <summary>
/// هر ماژولی که به اطلاعات پایه ارجاع می‌دهد این قرارداد را پیاده می‌کند تا حذف رکوردِ در حال استفاده
/// جلوگیری شود، بدون اینکه اطلاعات پایه جدول‌های آن ماژول را بشناسد.
/// </summary>
public interface IBaseInfoUsageChecker
{
    /// <returns>متن خطا برای کاربر اگر رکورد استفاده شده باشد، وگرنه null</returns>
    Task<string?> FindUsageAsync(BaseInfoReference kind, int id, CancellationToken cancellationToken);
}
