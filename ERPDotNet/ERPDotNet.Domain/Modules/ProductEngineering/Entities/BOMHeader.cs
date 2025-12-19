using ERPDotNet.Domain.Common;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Domain.Modules.ProductEngineering.Entities;

public class BOMHeader : BaseEntity
{
    public int Id { get; set; }
    
    // محصول نهایی (پدر) - اجباری
    public required int ProductId { get; set; }
    public Product? Product { get; set; }

    public required string Title { get; set; }// عنوان فرمول (مثلا: فرمول تابستانی)
    public required string Version { get; set; } // نسخه (v1.0)
    
    // نکته مهم: پیش‌فرض را Active می‌گذاریم تا فعلاً نیازی به تایید نباشد
    public BOMStatus Status { get; set; } = BOMStatus.Active; // وضعیت چرخه حیات
    public BOMType Type { get; set; } = BOMType.Manufacturing; // نوع (تولید، مهندسی)

    public DateTime FromDate { get; set; } = DateTime.UtcNow; // تاریخ شروع اعتبار
    public DateTime? ToDate { get; set; }  // تاریخ پایان اعتبار (نال = ابد)

    public bool IsActive { get; set; } = true; // فعال/غیرفعال دستی

    // اقلام زیرمجموعه
    public ICollection<BOMDetail> Details { get; set; } = new List<BOMDetail>();
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