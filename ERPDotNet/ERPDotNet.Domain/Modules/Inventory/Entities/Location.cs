using ERPDotNet.Domain.Common;
using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;


public class Location : BaseEntity
{
    public int Id { get; set; }
    public required int WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }
    [MaxLength(50)] public required string Code { get; set; } 
    [MaxLength(100)] public string? Title { get; set; }
    public bool IsBlocked { get; set; } = false;
}