using ERPDotNet.Domain.Modules.Inventory.Enums;

namespace ERPDotNet.Application.Modules.Inventory.DTOs;

public class ProductCardexDto
{
    public long TransactionId { get; set; }
    public DateTime TransactionDate { get; set; }
    
    // اطلاعات سند
    public long DocNumber { get; set; }
    public string DocTypeTitle { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty; // شرح هدر یا شرح ردیف
    public string WarehouseTitle { get; set; } = string.Empty;
    
    // اطلاعات تکمیلی (اختیاری)
    public string? BatchNumber { get; set; }
    public string? LocationCode { get; set; }

    // مقادیر
    public string SignTitle { get; set; } = string.Empty; // "وارده" یا "صادره"
    public decimal InQuantity { get; set; }  // مقدار وارده
    public decimal OutQuantity { get; set; } // مقدار صادره
    
    // موجودی خط به خط (مهمترین فیلد)
    public decimal RunningBalance { get; set; }
}