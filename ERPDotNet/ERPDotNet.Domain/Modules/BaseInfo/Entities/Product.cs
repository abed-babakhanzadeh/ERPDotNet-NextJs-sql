using ERPDotNet.Domain.Common;
using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Domain.Modules.BaseInfo.Entities;

public class Product : BaseEntity
{
    public int Id { get; set; }

    // 1. رشته‌ها: چون نباید نال باشند، required می‌کنیم
    public required string Code { get; set; } 
    public required string Name { get; set; } 
    public string? LatinName { get; set; } 
    public string? Descriptions { get; set; } 

    // 2. کلید خارجی (Foreign Key):
    // چون کالا بدون واحد معنی ندارد، این را هم required می‌کنیم.
    // اینجوری اگر توی هندلر یادت بره UnitId رو ست کنی، برنامه بیلد نمیشه (امنیت عالی!)
    public required int UnitId { get; set; }

    // 3. نویگیشن (Navigation Property):
    // این حتماً باید Nullable (?) باشد و required نباشد.
    // چون موقع ثبت کالا، این null است و فقط UnitId مقدار دارد.
    public Unit? Unit { get; set; }


    public ICollection<ProductUnitConversion> UnitConversions { get; set; } = new List<ProductUnitConversion>();

    // اینام‌ها چون Value Type هستند دیفالت دارند (0)، ولی required کردنش خوبه که مطمئن بشی ست شده.
    public required ProductSupplyType SupplyType { get; set; }
    public int? CategoryId { get; set; }
    public ProductCategory? Category { get; set; }
    public string? Barcode { get; set; }
    // شناسه کالا/خدمت در سامانه مودیان (۱۳ رقم)
    public string? TaxCode { get; set; }

    // فقط نام فایل یا مسیر نسبی را ذخیره می‌کنیم
    // مثال: "prod-1024-v1.jpg"
    public string? ImagePath { get; set; }

    public bool IsActive { get; set; } = true;

    // کالای مادر برای تنوع‌ها؛ تنوع خودش یک کالای کامل است
    public int? VariantParentId { get; set; }
    public Product? VariantParent { get; set; }
    public ICollection<ProductVariantValue> VariantValues { get; set; } = new List<ProductVariantValue>();
}

// اینام (Enum) برای نوع تامین
public enum ProductSupplyType
{
    [Display(Name = "خریدنی")]
    Purchased = 1,

    [Display(Name = "تولیدی")]
    Manufactured = 2,

    [Display(Name = "خدمات")]
    Service = 3,
    
    // فردا هر چیزی اضافه کنی، همینجا اسمش را هم می‌نویسی
    // [Display(Name = "ضایعات")]
    // Waste = 4
}