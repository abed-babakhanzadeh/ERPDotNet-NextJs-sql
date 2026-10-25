using System.Linq.Expressions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Workflow.Entities;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Workflow.Services;

// نقش‌های کاربر برای تصمیم‌گیری درباره دکمه‌های گردش کار
public sealed record BpmsUserRoles(bool IsAdmin, IReadOnlyCollection<string> RoleIds);

// قانون دسترسی به یک گذار (دکمه):
// - گذار بدون نقش برای همه کاربران آزاد است
// - گذار دارای نقش فقط برای کاربرانی است که یکی از آن نقش‌ها را دارند
// - نقش Admin به همه گذارها دسترسی دارد (هم‌راستا با PermissionService)
public static class BpmsTransitionAccess
{
    public const string AdminRoleName = "Admin";

    public static async Task<BpmsUserRoles> GetUserRolesAsync(
        IApplicationDbContext context,
        string? userId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(userId)) return new BpmsUserRoles(false, []);

        var roles = await context.UserRoles
            .AsNoTracking()
            .Where(ur => ur.UserId == userId)
            .Join(context.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => new { r.Id, r.Name })
            .ToListAsync(cancellationToken);

        return new BpmsUserRoles(
            roles.Any(r => r.Name == AdminRoleName),
            roles.Select(r => r.Id).ToList());
    }

    // برای استفاده داخل کوئری‌های EF (بدون لود کردن نقش‌های گذار در حافظه)
    public static Expression<Func<BpmsTransition, bool>> CanExecute(BpmsUserRoles user)
    {
        if (user.IsAdmin) return _ => true;

        var roleIds = user.RoleIds.ToList();
        return t => !t.AllowedRoles.Any() || t.AllowedRoles.Any(r => roleIds.Contains(r.RoleId));
    }
}
