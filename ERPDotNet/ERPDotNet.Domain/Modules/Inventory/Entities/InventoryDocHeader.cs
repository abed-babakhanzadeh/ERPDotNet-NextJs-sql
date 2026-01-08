using ERPDotNet.Domain.Common;
using System.ComponentModel.DataAnnotations;
using ERPDotNet.Domain.Modules.Inventory.Enums;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;


public class InventoryDocHeader : BaseEntity
{
    public long Id { get; set; }
    public int? FiscalYearId { get; set; }

    // اصلاح 5: کنترل یکتایی شماره سند
    // در فایل Configuration باید اینндекс گذاشته شود:
    // IF Scope == Global -> Unique(DocNumber)
    // IF Scope == PerYear -> Unique(DocNumber, FiscalYearId)
    // IF Scope == PerType -> Unique(DocNumber, DocTypeId)

    // اصلاح 5: کنترل یکتایی شماره سند
    public long DocNumber { get; set; }
    
    public DateTime DocDate { get; set; } = DateTime.UtcNow;

    public required int DocTypeId { get; set; }
    public InventoryDocType? DocType { get; set; }

    public required int WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }

    // فیلدهای انبار مقصد (برای حواله انتقالی)
    public int? DestinationWarehouseId { get; set; }
    public Warehouse? DestinationWarehouse { get; set; } // <--- این خط اضافه شد

    // Reference & Target Party
    [MaxLength(100)] public string? ReferenceEntityName { get; set; }
    public long? ReferenceEntityId { get; set; }
    public string? ReferenceExternalCode { get; set; }

    [MaxLength(100)] public string? TargetPartyType { get; set; }
    [MaxLength(100)] public string? TargetPartyId { get; set; }
    [MaxLength(200)] public string? TargetPartyName { get; set; }

    public InventoryDocStatus Status { get; set; } = InventoryDocStatus.Draft;
    public string? Description { get; set; }

    public ICollection<InventoryDocDetail> Details { get; set; } = new List<InventoryDocDetail>();
}