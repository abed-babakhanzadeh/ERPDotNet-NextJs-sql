using ERPDotNet.Domain.Common;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Domain.Modules.ProductEngineering.Entities;

/// <summary>
/// خروجی جانبی فرمول: محصول همزاد (ارزشمند، سهم بهای تمام‌شده دارد) یا ضایعات قابل بازیافت/محصول فرعی.
/// مقدار به ازای مقدار پایه فرمول است، مثل اقلام مصرفی.
/// </summary>
public class BOMOutput : BaseEntity
{
    public int Id { get; set; }

    public required int BOMHeaderId { get; set; }
    public BOMHeader? BOMHeader { get; set; }

    public required int ProductId { get; set; }
    public Product? Product { get; set; }

    public BOMOutputType Type { get; set; } = BOMOutputType.CoProduct;

    public decimal Quantity { get; set; }

    // سهم از بهای تمام‌شده؛ فقط برای محصول همزاد. باقی‌مانده به محصول اصلی می‌رسد
    public decimal CostSharePercent { get; set; }
}

public enum BOMOutputType
{
    [Display(Name = "محصول همزاد")]
    CoProduct = 1,

    [Display(Name = "محصول فرعی / ضایعات")]
    ByProduct = 2
}
