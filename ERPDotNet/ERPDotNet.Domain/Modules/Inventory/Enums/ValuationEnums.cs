using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Domain.Modules.Inventory.Enums;

public enum ValuationMethod
{
    [Display(Name = "میانگین موزون متحرک")]
    MovingAverage = 1,

    [Display(Name = "میانگین موزون دوره‌ای (ریالی کردن)")]
    PeriodicAverage = 2,

    [Display(Name = "اولین صادره از اولین وارده (FIFO)")]
    Fifo = 3
}

public enum ValuationLevel
{
    [Display(Name = "هر کالا در کل شرکت")]
    Company = 1,

    [Display(Name = "هر کالا در هر انبار")]
    Warehouse = 2
}

public enum ProductionCostBasis
{
    [Display(Name = "فقط مواد مصرفی")]
    MaterialsOnly = 1,

    [Display(Name = "مواد + دستمزد و سربار مرکز کاری")]
    MaterialsAndWorkCenters = 2
}
