using System.Reflection;
using ERPDotNet.Application.Common.Behaviors;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace ERPDotNet.Application;

public static class ConfigureServices
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());
        
        services.AddMediatR(cfg => {
            cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly());
            
            // ترتیب اجرای پایپ‌لاین (Middleware):
            // 1. اول کشینگ (اگر پاسخ در کش بود، بقیه اجرا نشوند)
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(CachingBehavior<,>));
            
            // 2. دوم ولیدیشن (دیتای غلط به دیتابیس نرسد) - این فایل را باید بسازید
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

            // 3. سوم کش اینولیدیشن (بعد از موفقیت، کش‌های قدیمی پاک شوند)
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(CacheInvalidationBehavior<,>));
        });

        return services;
    }
}