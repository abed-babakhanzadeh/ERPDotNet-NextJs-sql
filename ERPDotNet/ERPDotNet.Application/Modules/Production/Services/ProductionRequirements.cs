using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using ERPDotNet.Domain.Modules.Production.Entities;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Production.Services;

/// <summary>انتخاب فرمول قابل استفاده و محاسبه نیاز مواد سفارش تولید از آن</summary>
public static class ProductionRequirements
{
    /// <summary>فرمول‌های ساخت فعال یا تأییدشده کالا که در تاریخ داده‌شده معتبرند</summary>
    public static IQueryable<BOMHeader> UsableBoms(IApplicationDbContext context, int productId, DateTime at) =>
        UsableBoms(context, at).Where(b => b.ProductId == productId);

    /// <summary>همه فرمول‌های قابل استفاده در تاریخ داده‌شده (برای برنامه‌ریزی چندسطحی)</summary>
    public static IQueryable<BOMHeader> UsableBoms(IApplicationDbContext context, DateTime at) =>
        context.BOMHeaders.Where(b =>
            b.IsActive &&
            b.Type == BOMType.Manufacturing &&
            (b.Status == BOMStatus.Active || b.Status == BOMStatus.Approved) &&
            b.FromDate <= at &&
            (b.ToDate == null || b.ToDate >= at));

    /// <summary>ترتیب انتخاب فرمول پیش‌فرض: اول فرمول اصلی، بعد بالاترین نسخه</summary>
    public static IOrderedQueryable<BOMHeader> DefaultFirst(IQueryable<BOMHeader> boms) =>
        boms.OrderBy(b => b.Usage).ThenByDescending(b => b.Version);

    /// <summary>فرمول انتخاب‌شده، یا فرمول اصلی با بالاترین نسخه اگر انتخاب نشده باشد</summary>
    public static async Task<BOMHeader> ResolveBomAsync(
        IApplicationDbContext context, int productId, int? bomId, DateTime at, CancellationToken ct)
    {
        var boms = UsableBoms(context, productId, at).Include(b => b.Details);
        var bom = bomId.HasValue
            ? await boms.FirstOrDefaultAsync(b => b.Id == bomId, ct)
            : await DefaultFirst(boms).FirstOrDefaultAsync(ct);

        return bom ?? throw new BusinessRuleException(bomId.HasValue
            ? "فرمول انتخاب‌شده برای این کالا فعال یا معتبر نیست."
            : "برای این کالا فرمول تولید فعالی تعریف نشده است.");
    }

    /// <summary>مقادیر فرمول به ازای مقدار پایه است؛ به مقدار سفارش تبدیل و ضایعات اضافه می‌شود</summary>
    public static List<ProductionOrderMaterial> Explode(BOMHeader bom, decimal quantity)
    {
        var factor = quantity / (bom.BaseQuantity > 0 ? bom.BaseQuantity : 1);
        return bom.Details
            .Where(d => !d.IsDeleted)
            .OrderBy(d => d.Id)
            .Select(d =>
            {
                var standard = Math.Round(d.Quantity * factor, 6);
                return new ProductionOrderMaterial
                {
                    ProductId = d.ChildProductId,
                    StandardQuantity = standard,
                    WastePercentage = d.WastePercentage,
                    RequiredQuantity = Math.Round(standard * (1 + d.WastePercentage / 100m), 6)
                };
            })
            .ToList();
    }
}
