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
        // 1. آیا این درخواست ویژگی [Cached] دارد؟
        var cacheAttribute = request.GetType().GetCustomAttribute<CachedAttribute>();
        
        // اگر نداشت، معمولی اجرا کن و برو بعدی
        if (cacheAttribute == null)
        {
            return await next();
        }

        // 2. ساخت کلید منحصر به فرد برای کش
        // مثال: "GetAllUnitsQuery|{Page:1,Size:10}"
        var cacheKey = GenerateCacheKey(request);

        // 3. آیا در کش هست؟
        var cachedResponse = await _cacheService.GetAsync<TResponse>(cacheKey, cancellationToken);
        if (cachedResponse != null)
        {
            return cachedResponse; // سریع برگردان (بدون دیتابیس)
        }

        // 4. اگر نبود، اجرا کن (از دیتابیس بگیر)
        var response = await next();

        // 5. حالا ذخیره کن برای دفعه بعد
        await _cacheService.SetAsync(
            cacheKey, 
            response, 
            TimeSpan.FromSeconds(cacheAttribute.TimeToLiveSeconds), 
            cacheAttribute.Tags?.ToList(), // <--- ارسال تگ‌ها
            cancellationToken
        );
        return response;
    }

    private string GenerateCacheKey(TRequest request)
    {
        var requestName = typeof(TRequest).Name;
        var requestData = JsonSerializer.Serialize(request);
        return $"{requestName}|{requestData}";
    }
}