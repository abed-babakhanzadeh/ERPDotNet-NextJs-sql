using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Extensions;

public static class StockPersistenceExtensions
{
    // خروجی سرویس دامین مقدار نهایی موجودی است. رکوردهای موجود از همین DbContext خوانده و ویرایش شده‌اند
    // و Tracked هستند؛ جمع زدن دوباره آن‌ها موجودی را دو برابر می‌کند. فقط رکوردهای جدید باید Add شوند.
    public static async Task AddNewStocksAsync(
        this IApplicationDbContext context,
        IEnumerable<CurrentStock> updatedStocks,
        CancellationToken cancellationToken)
    {
        foreach (var stock in updatedStocks)
        {
            if (context.Entry(stock).State == EntityState.Detached)
            {
                await context.CurrentStocks.AddAsync(stock, cancellationToken);
            }
        }
    }
}
