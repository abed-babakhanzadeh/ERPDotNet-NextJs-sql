using System.Text.Json;
using ERPDotNet.Application.Common.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using StackExchange.Redis; // نیاز به پکیج StackExchange.Redis

namespace ERPDotNet.Infrastructure.Common.Services;

public class RedisCacheService : ICacheService
{
    private readonly IDistributedCache _cache;
    private readonly IConnectionMultiplexer _connection; // برای دسترسی مستقیم به دستورات Set

    public RedisCacheService(IDistributedCache cache, IConnectionMultiplexer connection)
    {
        _cache = cache;
        _connection = connection;
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        var data = await _cache.GetStringAsync(key, cancellationToken);
        return data == null ? default : JsonSerializer.Deserialize<T>(data);
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? slidingExpiration = null, List<string>? tags = null, CancellationToken cancellationToken = default)
    {
        var options = new DistributedCacheEntryOptions
        {
            SlidingExpiration = slidingExpiration ?? TimeSpan.FromMinutes(10)
        };
        
        var data = JsonSerializer.Serialize(value);
        await _cache.SetStringAsync(key, data, options, cancellationToken);

        // مدیریت تگ‌ها: کلید را در یک Set ذخیره می‌کنیم
        if (tags != null && tags.Any())
        {
            var db = _connection.GetDatabase();
            foreach (var tag in tags)
            {
                // نام ست: "tag:Units"
                await db.SetAddAsync($"tag:{tag}", key);
            }
        }
    }

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        await _cache.RemoveAsync(key, cancellationToken);
    }

    public async Task RemoveByTagAsync(string tag, CancellationToken cancellationToken = default)
    {
        var db = _connection.GetDatabase();
        var setKey = $"tag:{tag}";

        // 1. دریافت تمام کلیدهای عضو این تگ
        var keys = await db.SetMembersAsync(setKey);
        
        if (keys.Length > 0)
        {
            // تبدیل RedisValue[] به RedisKey[]
            var redisKeys = keys.Select(k => (RedisKey)k.ToString()).ToArray();

            // 2. حذف یکجای تمام کلیدها از دیتابیس (فقط 1 درخواست شبکه)
            // نکته: اینجا مستقیماً با درایور ردیس کار می‌کنیم که بسیار سریع‌تر از IDistributedCache است
            await db.KeyDeleteAsync(redisKeys);
            
            // 3. حذف خود تگ
            await db.KeyDeleteAsync(setKey);
        }
    }
}