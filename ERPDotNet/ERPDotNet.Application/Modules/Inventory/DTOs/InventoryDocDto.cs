using ERPDotNet.Domain.Modules.Inventory.Enums;

namespace ERPDotNet.Application.Modules.Inventory.DTOs;

public class InventoryDocDto
{
    // Header Info
    public long Id { get; set; }
    public long DocNumber { get; set; }
    public DateTime DocDate { get; set; }
    public int DocTypeId { get; set; }
    public string DocTypeTitle { get; set; } = string.Empty;
    public InventoryNature Nature { get; set; } // برای تشخیص رنگ و رفتار در فرانت
    
    public int WarehouseId { get; set; }
    public string WarehouseTitle { get; set; } = string.Empty;
    public int? DestinationWarehouseId { get; set; }
    public string? DestinationWarehouseTitle { get; set; }

    public InventoryDocStatus Status { get; set; }
    public string Description { get; set; } = string.Empty;

    // Party Info
    public string? ReferenceExternalCode { get; set; }
    public string? TargetPartyName { get; set; }

    // Concurrency
    public string RowVersion { get; set; } = string.Empty;

    // Details (Master-Detail)
    public List<InventoryDocDetailDto> Details { get; set; } = new();
}

public class InventoryDocDetailDto
{
    public long Id { get; set; }
    public int ProductId { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string UnitTitle { get; set; } = string.Empty; // واحد اصلی

    public decimal MainUnitQuantity { get; set; }
    public decimal SubUnitQuantity { get; set; }
    
    public int LocationId { get; set; }
    public string LocationCode { get; set; } = string.Empty;
    
    public int? BatchId { get; set; }
    public string? BatchNumber { get; set; }

    public string? Description { get; set; }
}