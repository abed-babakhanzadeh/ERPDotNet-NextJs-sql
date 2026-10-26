using ERPDotNet.Domain.Common;
using ERPDotNet.Domain.Modules.Inventory.Enums;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;

/// <summary>
/// تنظیمات سراسری ارزش‌گذاری موجودی (یک ردیف). روش و سطح پس از اولین تراکنش ارزش‌گذاری‌شده قفل می‌شوند،
/// چون تغییر آن‌ها وسط کار تاریخچه بها را بی‌معنی می‌کند.
/// </summary>
public class InventoryValuationSettings : BaseEntity
{
    public const int SingletonId = 1;

    public int Id { get; set; } = SingletonId;
    public ValuationMethod Method { get; set; } = ValuationMethod.MovingAverage;
    public ValuationLevel Level { get; set; } = ValuationLevel.Company;
    public ProductionCostBasis ProductionCostBasis { get; set; } = ProductionCostBasis.MaterialsOnly;
}
