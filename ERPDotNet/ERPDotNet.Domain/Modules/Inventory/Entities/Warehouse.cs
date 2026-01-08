using ERPDotNet.Domain.Common;
using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;

public class Warehouse : BaseEntity
{
    public int Id { get; set; }
    
    // اصلاح 4: آمادگی برای چند شرکتی (Multi-Company)
    // فعلاً Nullable است، اما اگر سیستم چند شرکتی شود، انبار حتماً مال یک شرکت است
    public int? CompanyId { get; set; } 

    [MaxLength(100)] public required string Title { get; set; }
    [MaxLength(50)] public required string Code { get; set; }
    
    public WarehouseType Type { get; set; } = WarehouseType.Physical;
    public bool IsActive { get; set; } = true;

    public ICollection<Location> Locations { get; set; } = new List<Location>();
}