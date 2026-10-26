using ERPDotNet.Domain.Modules.Inventory.Enums;

namespace ERPDotNet.Application.Modules.Inventory.Contracts;

/// <summary>
/// سطرهای اسناد انباری که به یک سند ماژول دیگر (مثلاً سفارش تولید) ارجاع دارند.
/// ماژول‌های دیگر مقدار صادر/دریافت‌شده را از همین‌جا می‌خوانند، نه از موجودیت‌های انبار،
/// تا ابطال یا ویرایش سند انبار خودبه‌خود در گزارش آن‌ها دیده شود.
/// </summary>
public interface IInventoryReferenceReader
{
    Task<List<ReferencedDocLine>> GetLinesAsync(string referenceEntityName, long referenceEntityId, CancellationToken cancellationToken);

    /// <summary>همان، برای چند سند مرجع در یک پرس‌وجو (گزارش‌ها)</summary>
    Task<List<ReferencedDocLine>> GetLinesAsync(string referenceEntityName, IReadOnlyCollection<long> referenceEntityIds, CancellationToken cancellationToken);
}

/// <param name="LineRole">نقش سطر در سند مرجع (ReferenceEntityName سطر)، مثلاً Material یا Scrap</param>
/// <param name="ReferenceLineId">شناسه سطر سند مرجع، اگر سطر از آن ساخته شده باشد</param>
public sealed record ReferencedDocLine(
    long ReferenceEntityId,
    long DocId,
    long DocNumber,
    string DocTypeTitle,
    InventoryNature Nature,
    InventoryDocStatus Status,
    DateTime DocDate,
    int WarehouseId,
    string WarehouseName,
    int ProductId,
    decimal Quantity,
    string? LineRole,
    long? ReferenceLineId);
