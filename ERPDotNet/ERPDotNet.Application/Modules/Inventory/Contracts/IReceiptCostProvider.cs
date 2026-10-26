namespace ERPDotNet.Application.Modules.Inventory.Contracts;

/// <summary>
/// بهای واحد سطرهای رسیدی که از سند ماژول دیگر ساخته شده (مثلاً رسید محصول سفارش تولید).
/// ماژول صاحب مرجع این قرارداد را پیاده می‌کند تا انبار به آن وابسته نشود.
/// سطری که در خروجی نیامده با میانگین فعلی ارزش‌گذاری می‌شود.
/// </summary>
public interface IReceiptCostProvider
{
    /// <summary>نام مرجع سربرگ سند (ReferenceEntityName) که این ارائه‌دهنده پاسخ می‌دهد</summary>
    string ReferenceEntityName { get; }

    Task<IReadOnlyDictionary<long, decimal>> GetUnitCostsAsync(ReceiptCostRequest request, CancellationToken cancellationToken);
}

public sealed record ReceiptCostRequest(long DocId, long ReferenceEntityId, IReadOnlyList<ReceiptCostLine> Lines);

/// <param name="LineRole">نقش سطر در سند مرجع (ReferenceEntityName سطر)</param>
public sealed record ReceiptCostLine(long DetailId, int ProductId, decimal Quantity, string? LineRole);
