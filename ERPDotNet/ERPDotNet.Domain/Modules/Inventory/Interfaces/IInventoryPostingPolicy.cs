using ERPDotNet.Domain.Modules.Inventory.Entities;

namespace ERPDotNet.Domain.Modules.Inventory.Interfaces;

// اینترفیس سیاست‌گذاری (Rules Engine)
// به جای اینکه بگوییم "منفی مجاز است"، از این سرویس می‌پرسیم "آیا برای این سند مجاز است؟"
public interface IInventoryPostingPolicy
{
    // آیا این نوع سند اجازه دارد موجودی را منفی کند؟
    bool CanGoNegative(InventoryDocType docType, int warehouseId);

    // آیا باید تاریخ انقضای بچ‌ها چک شود؟
    bool ShouldCheckExpiry(InventoryDocType docType);

    // آیا باید وضعیت مسدودی بچ‌ها چک شود؟
    bool ShouldCheckBatchBlockStatus(InventoryDocType docType);
}