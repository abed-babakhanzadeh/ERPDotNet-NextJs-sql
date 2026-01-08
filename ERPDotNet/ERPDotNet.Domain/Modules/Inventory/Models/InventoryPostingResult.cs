using ERPDotNet.Domain.Common; // فرض بر این است که IDomainEvent اینجا تعریف شده
using ERPDotNet.Domain.Modules.Inventory.Entities;

namespace ERPDotNet.Domain.Modules.Inventory.Models;

public class InventoryPostingResult
{
    public bool IsSuccess { get; private set; }
    public List<string> Errors { get; private set; } = new();

    // خروجی‌های محاسباتی (Ledger + Snapshot Update)
    public List<InventoryTransaction> GeneratedTransactions { get; private set; } = new();
    
    // لیست موجودی‌هایی که تغییر کرده‌اند (Dirty Objects)
    // لایه اپلیکیشن مسئول SaveChanges این‌هاست
    public List<CurrentStock> UpdatedStocks { get; private set; } = new();

    // هوک برای ایونت‌های دامنه (مثل: موجودی به زیر نقطه سفارش رسید)
    public List<BaseEvent> DomainEvents { get; private set; } = new();

    public static InventoryPostingResult Success(
        List<InventoryTransaction> transactions, 
        List<CurrentStock> stocks,
        List<BaseEvent>? events = null)
    {
        return new InventoryPostingResult 
        { 
            IsSuccess = true, 
            GeneratedTransactions = transactions, 
            UpdatedStocks = stocks,
            DomainEvents = events ?? new List<BaseEvent>()
        };
    }

    public static InventoryPostingResult Failure(params string[] errors)
    {
        return new InventoryPostingResult 
        { 
            IsSuccess = false, 
            Errors = errors.ToList() 
        };
    }
}