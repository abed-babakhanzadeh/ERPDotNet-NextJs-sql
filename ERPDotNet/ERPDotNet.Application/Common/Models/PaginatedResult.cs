using Microsoft.EntityFrameworkCore; // برای استفاده از ToListAsync در متد استاتیک

namespace ERPDotNet.Application.Common.Models;

public class PaginatedResult<T>
{
    public List<T> Items { get; set; }
    public int PageNumber { get; set; }
    public int TotalPages { get; set; }
    public int TotalCount { get; set; }

    public bool HasPreviousPage => PageNumber > 1;
    public bool HasNextPage => PageNumber < TotalPages;

    // 1. سازنده پیش‌فرض (برای سریالایزیشن)
    public PaginatedResult() 
    {
        Items = new List<T>();
    }

    // 2. سازنده دستی (همین که الان اضافه کردیم برای هندلر کالا)
    public PaginatedResult(List<T> items, int count, int pageNumber, int pageSize)
    {
        PageNumber = pageNumber;
        TotalPages = (int)Math.Ceiling(count / (double)pageSize);
        TotalCount = count;
        Items = items;
    }

    // 3. متد استاتیک (برای اکستنشن متد ToPaginatedListAsync)
    // اگر این را نگذارید، کدهای قبلی (مثل لیست واحدها) که از اکستنشن استفاده می‌کنند به خطا می‌خورند.
    public static async Task<PaginatedResult<T>> CreateAsync(IQueryable<T> source, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var count = await source.CountAsync(cancellationToken);
        var items = await source.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);

        return new PaginatedResult<T>(items, count, pageNumber, pageSize);
    }
}