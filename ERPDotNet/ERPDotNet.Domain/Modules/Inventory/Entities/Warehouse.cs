using ERPDotNet.Domain.Common;
using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;

public class Warehouse : BaseEntity
{
    public int Id { get; set; }
    public int? CompanyId { get; set; } 

    [MaxLength(100)] public required string Title { get; set; }
    [MaxLength(50)] public required string Code { get; set; }
    
    public WarehouseType Type { get; set; } = WarehouseType.Physical;

    // === این خط را اضافه کنید ===
    public string? Address { get; set; } 
    // ===========================

    public bool IsActive { get; set; } = true;

    public ICollection<Location> Locations { get; set; } = new List<Location>();
}