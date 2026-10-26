using System.ComponentModel.DataAnnotations;
using ERPDotNet.Domain.Common;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;

namespace ERPDotNet.Domain.Modules.Production.Entities;

/// <summary>
/// مرکز کاری (ایستگاه، ماشین یا خط) که عملیات تولید روی آن انجام می‌شود.
/// ظرفیت روزانه برای گزارش بار و مرکز هزینه برای بهای تمام‌شده (مرحله ۳) است.
/// </summary>
public class WorkCenter : BaseEntity
{
    public int Id { get; set; }

    [MaxLength(20)] public required string Code { get; set; }
    [MaxLength(100)] public required string Title { get; set; }

    public int? CostCenterId { get; set; }
    public CostCenter? CostCenter { get; set; }

    // ساعت کاری در دسترس در روز
    public decimal HoursPerDay { get; set; } = 8;

    public bool IsActive { get; set; } = true;
    [MaxLength(500)] public string? Description { get; set; }
}
