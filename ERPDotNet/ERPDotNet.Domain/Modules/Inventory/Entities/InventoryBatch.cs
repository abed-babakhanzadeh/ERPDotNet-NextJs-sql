using System.ComponentModel.DataAnnotations;
using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;

public class InventoryBatch : BaseEntity
{
    public int Id { get; set; }
    public required int ProductId { get; set; }
    
    [MaxLength(50)] public required string BatchNumber { get; set; }
    
    // تاریخ تولید و انقضا
    public DateTime? ManufactureDate { get; set; }
    public DateTime? ExpiryDate { get; set; }

    // === فیلدهای اضافه شده (Tier-0 Features) ===
    
    // کد بچ تامین کننده: حیاتی برای ردیابی مواد اولیه در صورت مرجوعی
    [MaxLength(50)] public string? SupplierBatchCode { get; set; }
    
    // توضیحات تکمیلی (مثلاً شرایط نگهداری خاص)
    [MaxLength(500)] public string? Description { get; set; }
    // ==========================================

    // وضعیت کیفی
    public bool IsBlocked { get; set; } = false; 
    [MaxLength(200)] public string? BlockReason { get; set; }

    // کنترل کیفیت: فقط بچ تأییدشده خارج (مصرف/فروش) می‌شود
    public BatchQcStatus QcStatus { get; set; } = BatchQcStatus.Released;
    [MaxLength(500)] public string? QcNote { get; set; }
    public DateTime? QcCheckedAt { get; set; }
    [MaxLength(450)] public string? QcCheckedBy { get; set; }
}

public enum BatchQcStatus
{
    [Display(Name = "تأیید شده")]
    Released = 1,

    [Display(Name = "قرنطینه (در انتظار QC)")]
    Quarantine = 2,

    [Display(Name = "مردود")]
    Rejected = 3
}