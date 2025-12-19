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
        // 1. اجرای درخواست اصلی (اول بذاریم دیتا در دیتابیس ذخیره شود)
        var response = await next();

        // 2. بررسی اینکه آیا نیاز به پاکسازی کش دارد؟
        var attribute = request.GetType().GetCustomAttribute<CacheInvalidationAttribute>();
        
        if (attribute != null)
        {
            foreach (var tag in attribute.Tags)
            {
                await _cacheService.RemoveByTagAsync(tag, cancellationToken);
            }
        }

        return response;
    }
}