using System.ComponentModel.DataAnnotations;
using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.ProductEngineering.Entities;

/// <summary>
/// یک عملیات از مسیر تولید فرمول. زمان اجرا به ازای مقدار پایه فرمول است، مثل مقدار اقلام.
/// مرکز کاری از ماژول تولید فقط با شناسه ارجاع می‌شود (بدون navigation بین ماژول‌ها).
/// </summary>
public class BOMOperation : BaseEntity
{
    public int Id { get; set; }

    public required int BOMHeaderId { get; set; }
    public BOMHeader? BOMHeader { get; set; }

    // ترتیب اجرا (۱۰، ۲۰، ...)
    public int Sequence { get; set; }
    [MaxLength(100)] public required string Title { get; set; }

    public required int WorkCenterId { get; set; }

    // زمان آماده‌سازی هر بار اجرای سفارش (دقیقه، مستقل از مقدار)
    public decimal SetupMinutes { get; set; }
    // زمان اجرا برای مقدار پایه فرمول (دقیقه)
    public decimal RunMinutes { get; set; }

    [MaxLength(500)] public string? Description { get; set; }
}
