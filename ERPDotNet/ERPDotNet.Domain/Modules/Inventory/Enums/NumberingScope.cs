namespace ERPDotNet.Domain.Modules.Inventory.Enums;


public enum NumberingScope
{
    Global = 1,      // سریال کلی (1, 2, 3...)
    PerFiscalYear = 2, // هر سال ریست شود (1403-1, 1403-2...)
    PerDocType = 3   // هر نوع سند سریال جدا دارد (رسید-1, حواله-1...)
}