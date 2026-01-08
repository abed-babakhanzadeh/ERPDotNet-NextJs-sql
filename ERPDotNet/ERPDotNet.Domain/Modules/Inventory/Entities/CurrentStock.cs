using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;

// جدول موجودی لحظه‌ای (Snapshot)
// این جدول با هر تراکنش Update می‌شود تا گزارش موجودی سریع باشد
public class CurrentStock : BaseEntity
{
    public long Id { get; set; }

    public required int WarehouseId { get; set; }
    public required int ProductId { get; set; }
    
    // موجودی در سطح بچ و لوکیشن هم نگهداری می‌شود
    public int? LocationId { get; set; }
    public int? BatchId { get; set; }

    // مانده فعلی (مجموع جبری تراکنش‌ها)
    public decimal QuantityOnHand { get; set; }

    // مقدار رزرو شده (مثلاً برای حواله فروش تایید شده ولی خارج نشده)
    public decimal QuantityReserved { get; set; }
}