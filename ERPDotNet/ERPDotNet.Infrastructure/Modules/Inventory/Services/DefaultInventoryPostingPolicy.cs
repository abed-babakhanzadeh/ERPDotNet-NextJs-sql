using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Enums;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Services;

public class DefaultInventoryPostingPolicy : IInventoryPostingPolicy
{
    // این تنظیمات می‌توانند بعداً از دیتابیس (AppSetting) خوانده شوند
    
    public bool CanGoNegative(InventoryDocType docType, int warehouseId)
    {
        // مثال: فعلاً می‌گوییم هیچ انباری منفی نشود
        // در آینده: return _db.Settings.Any(s => s.WarehouseId == warehouseId && s.AllowNegative);
        return false;
    }

    public bool ShouldCheckExpiry(InventoryDocType docType)
    {
        // مثال: فقط برای حواله‌های فروش و مصرف تاریخ انقضا مهم است
        // اگر ماهیت خروج باشد، انقضا را چک کن
        return docType.Nature == InventoryNature.Output;
    }

    public bool ShouldCheckBatchBlockStatus(InventoryDocType docType)
    {
        // همیشه وضعیت مسدودی بچ را چک کن (امنیت بالا)
        return true;
    }
}