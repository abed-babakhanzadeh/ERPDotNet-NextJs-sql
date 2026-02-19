namespace ERPDotNet.Application.Modules.Inventory.DTOs;

public class InventoryStockDto
{
    public long Id { get; set; }
    
    // ✅ این فیلد اضافه شد
    public string WarehouseTitle { get; set; } = string.Empty;

    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;
    public string UnitTitle { get; set; } = string.Empty;

    public decimal QuantityOnHand { get; set; }
    public decimal QuantityReserved { get; set; }
    public decimal QuantityBlocked { get; set; } = 0;
    public decimal AvailableQuantity { get; set; }

    public string LocationCode { get; set; } = string.Empty;
    public string LocationPath { get; set; } = string.Empty;
    public string BatchNumber { get; set; } = string.Empty;
}