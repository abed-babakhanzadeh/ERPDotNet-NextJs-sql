namespace ERPDotNet.Application.Modules.Inventory.Contracts;

/// <summary>
/// موجودی «قابل مصرف» کالاها برای برنامه‌ریزی (MRP و گزارش کسری) در ماژول‌های دیگر.
/// قابل مصرف یعنی: انبار فعال فیزیکی یا پای خط؛ بچ تأییدشده، مسدودنشده و منقضی‌نشده؛ منهای رزرو.
/// موجودی ضایعات، قرنطینه و امانی حساب نمی‌شود.
/// </summary>
public interface IInventoryAvailabilityReader
{
    /// <param name="warehouseIds">خالی یعنی همه انبارهای در دسترس کاربر</param>
    Task<AvailableStock> GetUsableAsync(
        IReadOnlyCollection<int> productIds, IReadOnlyCollection<int>? warehouseIds, CancellationToken cancellationToken);
}

/// <param name="LimitedToAccessibleWarehouses">موجودی فقط از انبارهایی است که کاربر به آن‌ها دسترسی دارد</param>
public sealed record AvailableStock(IReadOnlyDictionary<int, decimal> ByProduct, bool LimitedToAccessibleWarehouses);
