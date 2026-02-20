using System.Security.Claims;
using ERPDotNet.Application.Common.Interfaces;

namespace ERPDotNet.API.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string? UserId => _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);

    // 🌟 استخراج شناسه شرکت از توکن (با مقدار پیش‌فرض ۱ برای جلوگیری از خطا در توکن‌های قدیمی)
    public string? CompanyId => _httpContextAccessor.HttpContext?.User?.FindFirstValue("CompanyId") ?? "1";
}