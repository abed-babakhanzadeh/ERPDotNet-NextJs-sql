using ERPDotNet.Domain.Modules.Inventory.Entities;

namespace ERPDotNet.Application.Modules.Inventory.DTOs;

public class InventoryItemProfileDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    
    public bool IsBatchManaged { get; set; }
    public bool IsSerialManaged { get; set; }
    public int? ShelfLifeDays { get; set; }

    public int MainInventoryUnitId { get; set; }
    public string MainInventoryUnitTitle { get; set; } = string.Empty;

    // لیست تنظیمات به تفکیک انبارها
    public List<ItemWarehouseSettingDto> WarehouseSettings { get; set; } = new();
}

public class ItemWarehouseSettingDto
{
    public int Id { get; set; }
    public int WarehouseId { get; set; }
    public string WarehouseTitle { get; set; } = string.Empty;

    public decimal MinStock { get; set; }
    public decimal MaxStock { get; set; }
    public decimal ReorderPoint { get; set; }

    public int? DefaultLocationId { get; set; }
    public string? DefaultLocationTitle { get; set; }
    public string? DefaultLocationCode { get; set; }
}