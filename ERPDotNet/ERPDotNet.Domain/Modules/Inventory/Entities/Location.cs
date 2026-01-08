using ERPDotNet.Domain.Common;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;

public class Location : BaseEntity
{
    public int Id { get; set; }
    public required int WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }

    [MaxLength(50)] public required string Code { get; set; } 
    [MaxLength(100)] public string? Title { get; set; }

    // === فیلد اضافه شده (Tier-0 Feature) ===
    // برای ساختار درختی (مثلاً: سالن > ردیف > طبقه > سلول)
    public int? ParentId { get; set; }

    // === Tier-0 Performance: ذخیره مسیر کامل ===
    // فرمت: "CodeParent/CodeChild"
    // مثال: "SalonA/Row1/Cell5"
    [MaxLength(1000)] 
    public string Path { get; set; } = string.Empty;
    
    [ForeignKey("ParentId")]
    public Location? Parent { get; set; }
    public ICollection<Location> Children { get; set; } = new List<Location>();
    // =======================================

    public bool IsBlocked { get; set; } = false;
}