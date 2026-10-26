using System.ComponentModel.DataAnnotations;
using ERPDotNet.Domain.Common;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;

namespace ERPDotNet.Domain.Modules.Production.Entities;

/// <summary>
/// سفارش تولید: ساخت مقدار مشخصی از یک کالا با یک نسخه از فرمول (BOM).
/// نیاز مواد از فرمول محاسبه و در سفارش ثبت می‌شود تا تغییر بعدی فرمول روی سفارش‌های جاری اثر نگذارد.
/// </summary>
public class ProductionOrder : BaseEntity
{
    public int Id { get; set; }

    [MaxLength(20)] public string OrderNumber { get; set; } = "";

    public required int ProductId { get; set; }
    public Product? Product { get; set; }

    public required int BOMHeaderId { get; set; }
    public BOMHeader? BOMHeader { get; set; }

    // به واحد اصلی محصول
    public decimal Quantity { get; set; }

    public DateTime? PlannedStartDate { get; set; }
    public DateTime? PlannedEndDate { get; set; }

    public ProductionOrderStatus Status { get; set; } = ProductionOrderStatus.Draft;

    [MaxLength(500)] public string? Description { get; set; }

    public ICollection<ProductionOrderMaterial> Materials { get; set; } = new List<ProductionOrderMaterial>();
}

/// <summary>نیاز یک ماده اولیه برای سفارش (به واحد اصلی ماده، با احتساب ضایعات فرمول)</summary>
public class ProductionOrderMaterial
{
    public int Id { get; set; }

    public int ProductionOrderId { get; set; }
    public ProductionOrder? ProductionOrder { get; set; }

    public required int ProductId { get; set; }
    public Product? Product { get; set; }

    // مصرف استاندارد بدون ضایعات
    public decimal StandardQuantity { get; set; }
    public decimal WastePercentage { get; set; }
    public decimal RequiredQuantity { get; set; }
}

public enum ProductionOrderStatus
{
    [Display(Name = "پیش‌نویس")]
    Draft = 1,

    [Display(Name = "تأیید شده")]
    Released = 2,

    [Display(Name = "در حال تولید")]
    InProgress = 3,

    [Display(Name = "تکمیل شده")]
    Completed = 4,

    [Display(Name = "ابطال شده")]
    Cancelled = 5
}
