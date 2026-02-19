using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.UserAccess.Interfaces;
using ERPDotNet.Domain.Modules.UserAccess.Entities;
using ERPDotNet.Infrastructure.Common.Services;
using ERPDotNet.Infrastructure.Modules.UserAccess.Services;
using ERPDotNet.Infrastructure.Persistence;
using ERPDotNet.Infrastructure.Persistence.Interceptors;
// === 1. این سه خط را برای ماژول انبار اضافه کنید ===
using ERPDotNet.Domain.Modules.Inventory.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Services;
using ERPDotNet.Infrastructure.Modules.Inventory.Services;
using ERPDotNet.Infrastructure.Modules.Inventory.Persistence.Repositories;
// ==================================================
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;
using System.Text;
using ERPDotNet.Application.Modules.Inventory.Interfaces;

namespace ERPDotNet.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services, 
        IConfiguration configuration)
    {

        // 1. Database Configuration
        AddDatabaseServices(services, configuration);

        // 2. Identity Configuration
        AddIdentityServices(services);

        // 3. Redis & Caching
        AddRedisCaching(services, configuration);

        // 4. Authentication & JWT
        AddAuthenticationServices(services, configuration);

        // 5. Application Services
        AddApplicationServices(services);
        // === 6. اضافه کردن سرویس‌های انبار (خط جدید) ===
        AddInventoryServices(services);

        // === اضافه کردن سرویس‌های موتور فرآیند (خط جدید) ===
        AddWorkflowServices(services);
        // ==============================================

        services.AddScoped<ApplicationDbContextInitialiser>();

        

        return services;
    }

    private static void AddDatabaseServices(
        IServiceCollection services, 
        IConfiguration configuration)
    {
        services.AddScoped<AuditableEntitySaveChangesInterceptor>();

        services.AddDbContext<AppDbContext>((sp, options) =>
        {
            var auditableInterceptor = sp.GetRequiredService<AuditableEntitySaveChangesInterceptor>();

            // options.UseNpgsql(configuration.GetConnectionString("DefaultConnection"))
            //        .AddInterceptors(auditableInterceptor);

            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection"))
                   .AddInterceptors(auditableInterceptor);
        });

        services.AddScoped<IApplicationDbContext>(provider => 
            provider.GetRequiredService<AppDbContext>());
    }

    private static void AddIdentityServices(IServiceCollection services)
    {
        services.AddIdentity<User, IdentityRole>()
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

        services.AddScoped<IIdentityService, IdentityService>();
    }

    private static void AddRedisCaching(
        IServiceCollection services, 
        IConfiguration configuration)
    {
        var redisConnectionString = configuration.GetConnectionString("Redis") 
            ?? "redis:6379";

        services.AddSingleton<IConnectionMultiplexer>(sp => 
            ConnectionMultiplexer.Connect(redisConnectionString));

        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = redisConnectionString;
        });

        services.AddScoped<ICacheService, RedisCacheService>();
    }

    private static void AddAuthenticationServices(
        IServiceCollection services, 
        IConfiguration configuration)
    {
        var jwtSettings = configuration.GetSection("JwtSettings");
        var secretKeyString = jwtSettings["Secret"] 
            ?? configuration["JwtSettings:Secret"] 
            ?? "YourTemporarySecretKeyMustBeLongEnough123456!";

        var secretKey = Encoding.UTF8.GetBytes(secretKeyString);

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSettings["Issuer"] ?? "ERPDotNet",
                ValidAudience = jwtSettings["Audience"] ?? "ERPDotNetClient",
                IssuerSigningKey = new SymmetricSecurityKey(secretKey)
            };
        });

        services.AddScoped<ITokenService, JwtTokenService>();
    }

    private static void AddApplicationServices(IServiceCollection services)
    {
        services.AddScoped<IPermissionService, PermissionService>();
        
    }

    private static void AddInventoryServices(IServiceCollection services)
    {
        // ریپازیتوری دیتابیس (خواندن موجودی و ...)
        services.AddScoped<IInventoryDomainRepository, InventoryDomainRepository>();

        // سیاست‌گذاری‌ها (قوانین انبار)
        services.AddScoped<IInventoryPostingPolicy, DefaultInventoryPostingPolicy>();

        // سرویس دامنه (مغز متفکر انبار)
        // نکته: این سرویس در لایه دامین است اما اینجا به کانتینر معرفی می‌شود
        services.AddScoped<IInventoryPostingService, InventoryPostingService>();
        services.AddScoped<IDocumentNumberingService, DocumentNumberingService>();
    }

    // متد جدید در پایین فایل:
    private static void AddWorkflowServices(IServiceCollection services)
    {
        // در مراحل بعدی، سرویس‌هایی مثل IBpmsEngineService یا رجیستری داینامیکِ ActionCode ها اینجا قرار می‌گیرد
    }
}