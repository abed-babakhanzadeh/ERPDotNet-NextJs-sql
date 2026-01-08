namespace ERPDotNet.Domain.Modules.Inventory.Enums;


public enum InventoryDocStatus
{
    Draft = 1,
    Posted = 2,
    Cancelled = 3 // ابطال (منجر به صدور سند معکوس در تراکنش‌ها می‌شود)
}