using ERPDotNet.Domain.Common;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;

namespace ERPDotNet.Domain.Modules.ProductEngineering.Entities;

public class BOMDetail : BaseEntity
{
    public int Id { get; set; }

    // لینک به هدر - اجباری
    public required int BOMHeaderId { get; set; }
    public BOMHeader? BOMHeader { get; set; }

    // ماده اولیه (فرزند) - اجباری
    public required int ChildProductId { get; set; }
    public Product? ChildProduct { get; set; }

        // مقدار مصرف
    public decimal Quantity { get; set; }
    
    // --- فیلدهای جدید برای نگهداری ورودی کاربر ---
    
    // مقداری که کاربر تایپ کرده (مثلا 2)
    public decimal InputQuantity { get; set; }

    // واحدی که کاربر انتخاب کرده (مثلا شاخه)
    public int InputUnitId { get; set; }
    
    // (اختیاری) نویگیشن پراپرتی برای واحد ورودی
    public Unit? InputUnit { get; set; }


    
    // درصد ضایعات (پیش‌بینی پرت مواد)
    public decimal WastePercentage { get; set; } = 0;

    // لیست کالاهای جایگزین برای این سطر
    public ICollection<BOMSubstitute> Substitutes { get; set; } = new List<BOMSubstitute>();
}