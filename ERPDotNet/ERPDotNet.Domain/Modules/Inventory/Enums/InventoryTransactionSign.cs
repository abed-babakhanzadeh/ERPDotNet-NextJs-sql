namespace ERPDotNet.Domain.Modules.Inventory.Enums;

// اصلاح 1: محدود کردن جهت حرکت کالا برای جلوگیری از خطا
public enum InventoryTransactionSign
{
    Increase = 1,  // افزایش موجودی (وارده)
    Decrease = -1  // کاهش موجودی (صادره)
}