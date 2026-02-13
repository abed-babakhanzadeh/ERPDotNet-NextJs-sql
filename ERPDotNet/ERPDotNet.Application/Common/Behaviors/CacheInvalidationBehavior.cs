using System.Reflection;
using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using MediatR;

namespace ERPDotNet.Application.Common.Behaviors;

public class CacheInvalidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly ICacheService _cacheService;

    public CacheInvalidationBehavior(ICacheService cacheService)
    {
        _cacheService = cacheService;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        // 1. استفاده از typeof(TRequest) به جای GetType() برای دقت ۱۰۰ درصد
        var attribute = typeof(TRequest).GetCustomAttribute<CacheInvalidationAttribute>();

        var response = await next();

        // 2. بررسی اتریبیوت
        if (attribute != null && attribute.Tags != null)
        {
            // 3. یک چک هوشمندانه: اگر پاسخ bool است و false بود، یعنی حذفی انجام نشده، پس کش را پاک نکن
            if (response is bool success && !success)
            {
                return response;
            }

            foreach (var tag in attribute.Tags)
            {
                await _cacheService.RemoveByTagAsync(tag, cancellationToken);
            }
        }

        return response;
    }
}