using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Interfaces;

namespace ERPDotNet.Domain.Modules.Inventory.Models;

public class InventoryPostingContext
{
    public required InventoryDocHeader Header { get; set; }
    public required InventoryDocType DocType { get; set; }
    
    // جایگزین فیلدهای boolean ساده: تزریق استراتژی
    public required IInventoryPostingPolicy Policy { get; set; }

    // اطلاعات کاربر جاری (برای لاگ کردن یا چک کردن دسترسی‌های خاص در سطح دامنه)
    public long? UserId { get; set; }
}