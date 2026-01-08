using System.ComponentModel.DataAnnotations;
using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;


// تعریف بچ (شناسنامه بچ)
// نکته: موجودی بچ اینجا نیست، در Transaction است.
public class InventoryBatch : BaseEntity
{
    public int Id { get; set; }
    public required int ProductId { get; set; }
    
    [MaxLength(50)] public required string BatchNumber { get; set; }
    
    public DateTime? ManufactureDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    
    // وضعیت کیفی بچ (مسدود شده توسط QC)
    public bool IsBlocked { get; set; } = false; 
    [MaxLength(200)] public string? BlockReason { get; set; }
}