using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.BaseInfo.Entities;

public class ProductUnitConversion : BaseEntity
{
    public int Id { get; set; }

    // 1. کالای مرتبط
    public int ProductId { get; set; }
    public Product? Product { get; set; }

    // 2. واحد فرعی (مثلاً متر مربع)
    public int AlternativeUnitId { get; set; }
    public Unit? AlternativeUnit { get; set; }

    // 3. ضریب تبدیل به واحد اصلی کالا
    // فرمول: 1 واحد فرعی = (Factor) واحد اصلی
    // مثال: اگر واحد اصلی کیلوگرم است و واحد فرعی متر مربع
    // و هر 1 متر مربع وزن 2 کیلوگرم دارد -> Factor = 2
    public decimal Factor { get; set; }

    // توضیحات (مثلاً "تبدیل مخصوص فروش")
    public string? Description { get; set; }
}