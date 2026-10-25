using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands;

// قانون مشترک ساخت و ویرایش سند: سند انتقال بدون انبار مقصد (یا با مقصدی برابر مبدأ) معنا ندارد
internal static class TransferDestinationRule
{
    public const string Message = "برای سند انتقال، انبار مقصد الزامی است و باید با انبار مبدأ متفاوت باشد.";

    public static async Task<bool> IsValidAsync(
        IApplicationDbContext context,
        int docTypeId,
        int warehouseId,
        int? destinationWarehouseId,
        CancellationToken cancellationToken)
    {
        var nature = await context.InventoryDocTypes
            .AsNoTracking()
            .Where(x => x.Id == docTypeId)
            .Select(x => (InventoryNature?)x.Nature)
            .FirstOrDefaultAsync(cancellationToken);

        if (nature != InventoryNature.Transfer) return true;

        return destinationWarehouseId is > 0 && destinationWarehouseId != warehouseId;
    }
}
