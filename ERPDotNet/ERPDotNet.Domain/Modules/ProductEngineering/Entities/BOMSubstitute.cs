using ERPDotNet.Domain.Common;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;

namespace ERPDotNet.Domain.Modules.ProductEngineering.Entities;

public class BOMSubstitute : BaseEntity
{
    public int Id { get; set; }

    // لینک به سطر اصلی - اجباری
    public required int BOMDetailId { get; set; }
    public BOMDetail? BOMDetail { get; set; }

    // کالای جایگزین - اجباری
    public required int SubstituteProductId { get; set; }
    public Product? SubstituteProduct { get; set; }

    public int Priority { get; set; } = 1; // اولویت (۱ بالاتر)
    public decimal Factor { get; set; } = 1; // ضریب تبدیل (۱ عدد جایگزین = ۱ عدد اصلی)

    // --- فیلدهای جدید برای مدیریت پیشرفته ---
    
    // آیا مصرف همزمان (میکس) با کالای اصلی مجاز است؟
    public bool IsMixAllowed { get; set; } = false;

    // اگر میکس مجاز است، حداکثر چند درصد از نیاز را می‌تواند تامین کند؟ (مثلا 30%)
    public decimal MaxMixPercentage { get; set; } = 0;

    // توضیحات فنی (مثلا: فقط در صورت کمبود موجودی اصلی استفاده شود)
    public string? Note { get; set; }
}