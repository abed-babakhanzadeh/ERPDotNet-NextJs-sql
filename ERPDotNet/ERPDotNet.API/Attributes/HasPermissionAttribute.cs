using ERPDotNet.API.ErrorHandling;
using ERPDotNet.Application.Modules.UserAccess.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Security.Claims;

namespace ERPDotNet.API.Attributes;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class HasPermissionAttribute : TypeFilterAttribute
{
    public HasPermissionAttribute(string permission) : base(typeof(HasPermissionFilter))
    {
        Arguments = new object[] { permission };
    }
}

// تغییر از IAuthorizationFilter به IAsyncAuthorizationFilter
public class HasPermissionFilter : IAsyncAuthorizationFilter
{
    private readonly string _permission;
    private readonly IPermissionService _permissionService;

    public HasPermissionFilter(string permission, IPermissionService permissionService)
    {
        _permission = permission;
        _permissionService = permissionService;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        // 1. آیا کاربر لاگین کرده؟
        if (context.HttpContext?.User?.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        // 2. دریافت آیدی کاربر از توکن
        var userId = context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        // 3. دریافت لیست مجوزها (حالا می‌توانیم await کنیم و ترد را بلاک نکنیم)
        var userPermissions = await _permissionService.GetUserPermissionsAsync(userId);

        // 4. چک کردن مجوز
        if (!userPermissions.Contains(_permission))
        {
            // کاربر لاگین هست اما دسترسی ندارد -> 403 با پیام فارسی و نام مجوز (برای پیگیری)
            var problem = new ProblemDetails
            {
                Status = StatusCodes.Status403Forbidden,
                Title = "عدم دسترسی",
                Detail = "شما دسترسی لازم برای این عملیات را ندارید."
            };
            problem.Extensions["code"] = ApiProblem.Codes.Forbidden;
            problem.Extensions["permission"] = _permission;
            ApiProblem.Enrich(context.HttpContext, problem);
            context.Result = new ObjectResult(problem) { StatusCode = StatusCodes.Status403Forbidden };
            return;
        }

        // اگر همه چیز اوکی بود، متد ادامه پیدا می‌کند
    }
}