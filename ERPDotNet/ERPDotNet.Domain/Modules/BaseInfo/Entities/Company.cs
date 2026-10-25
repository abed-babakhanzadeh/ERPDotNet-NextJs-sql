using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.BaseInfo.Entities;

// شرکت (شخص حقوقی صاحب دفاتر)؛ سال مالی و انبار به آن تعلق می‌گیرند
public class Company : BaseEntity
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public required string Title { get; set; }
    public string? NationalId { get; set; }   // شناسه ملی
    public string? EconomicCode { get; set; } // کد اقتصادی
    public string? RegistrationNumber { get; set; } // شماره ثبت
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public bool IsActive { get; set; } = true;
}
