namespace ERPDotNet.Application.Common.Interfaces;

public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default);
    
    // اضافه شدن پارامتر tags
    Task SetAsync<T>(string key, T value, TimeSpan? slidingExpiration = null, List<string>? tags = null, CancellationToken cancellationToken = default);
    
    Task RemoveAsync(string key, CancellationToken cancellationToken = default);
    
    // متد جدید: پاک کردن بر اساس تگ (گروه)
    Task RemoveByTagAsync(string tag, CancellationToken cancellationToken = default);
}