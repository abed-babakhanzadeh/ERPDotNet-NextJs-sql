// ERPDotNet.Domain/Modules/ProductEngineering/Entities/BOMHeader.cs

using ERPDotNet.Domain.Common;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Domain.Modules.ProductEngineering.Entities;

public class BOMHeader : BaseEntity
{
    public int Id { get; set; }
    
    public required int ProductId { get; set; }
    public Product? Product { get; set; }

    public required string Title { get; set; }
    // --- تغییر: ورژن عددی شد ---
    public int Version { get; set; } 
    // ---------------------------

    // --- تغییر جدید: تعیین استراتژی استفاده (اصلی یا فرعی) ---
    public BOMUsage Usage { get; set; } = BOMUsage.Main;
    // --------------------------------------------------------

    public BOMStatus Status { get; set; } = BOMStatus.Active; 
    public BOMType Type { get; set; } = BOMType.Manufacturing; 

    public DateTime FromDate { get; set; } = DateTime.UtcNow; 
    public DateTime? ToDate { get; set; }

    public bool IsActive { get; set; } = true; 

    public ICollection<BOMDetail> Details { get; set; } = new List<BOMDetail>();
}

// --- Enum جدید ---
public enum BOMUsage
{
    [Display(Name = "فرمول اصلی (پیش‌فرض تولید)")]
    Main = 1,

    [Display(Name = "فرمول جایگزین")]
    Alternate = 2
}

public enum BOMStatus
{
    [Display(Name = "پیش‌نویس")]
    Draft = 1,
    [Display(Name = "تایید شده")]
    Approved = 2,
    [Display(Name = "فعال")]
    Active = 3,
    [Display(Name = "منسوخ")]
    Obsolete = 4
}

public enum BOMType
{
    [Display(Name = "ساخت (MBOM)")]
    Manufacturing = 1,
    [Display(Name = "مهندسی (EBOM)")]
    Engineering = 2,
    [Display(Name = "کیت فروش")]
    Sales = 3
}