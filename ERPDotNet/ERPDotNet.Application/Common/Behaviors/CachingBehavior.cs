using System.Reflection;
using System.Text;
using System.Text.Json;
using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using MediatR;

namespace ERPDotNet.Application.Common.Behaviors;

public class CachingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly ICacheService _cacheService;

    public CachingBehavior(ICacheService cacheService)
    {
        _cacheService = cacheService;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        // 1. بررسی وجود اتریبیوت [Cached] روی کوئری
        var cacheAttribute = typeof(TRequest).GetCustomAttribute<CachedAttribute>();
        
        if (cacheAttribute == null)
        {
            return await next();
        }

        // 2. تولید کلید یکتا
        var cacheKey = GenerateCacheKey(request);

        // 3. تلاش برای خواندن از ردیس
        var cachedResponse = await _cacheService.GetAsync<TResponse>(cacheKey, cancellationToken);
        if (cachedResponse != null)
        {
            return cachedResponse;
        }

        // 4. اگر در کش نبود، اجرا کن (برو دیتابیس)
        var response = await next();

        // 5. ذخیره پاسخ در ردیس با تگ‌های مربوطه
        if (response != null)
        {
            await _cacheService.SetAsync(
                cacheKey, 
                response, 
                TimeSpan.FromSeconds(cacheAttribute.TimeToLiveSeconds), 
                cacheAttribute.Tags?.ToList(),
                cancellationToken
            );
        }

        return response;
    }

    private string GenerateCacheKey(TRequest request)
    {
        var requestName = typeof(TRequest).Name;
        // تنظیمات سریالایزر برای کلیدهای کش ثابت
        var options = new JsonSerializerOptions { WriteIndented = false };
        var requestData = JsonSerializer.Serialize(request, options);
        return $"{requestName}|{requestData}";
    }
}