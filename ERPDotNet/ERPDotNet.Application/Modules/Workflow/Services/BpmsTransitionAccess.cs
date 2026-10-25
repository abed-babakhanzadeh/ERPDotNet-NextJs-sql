using System.Linq.Expressions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Workflow.Entities;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Workflow.Services;

// نقش‌های کاربر برای تصمیم‌گیری درباره دکمه‌های گردش کار
// DelegatedRoleIds: نقش‌هایی که از راه تفویض فعال رسیده، به‌ازای کاربر تفویض‌کننده
public sealed record BpmsUserRoles(bool IsAdmin, IReadOnlyCollection<string> RoleIds)
{
    public IReadOnlyDictionary<string, IReadOnlyCollection<string>> DelegatedRoleIds { get; init; } =
        new Dictionary<string, IReadOnlyCollection<string>>();

    public IReadOnlyCollection<string> AllRoleIds =>
        RoleIds.Concat(DelegatedRoleIds.Values.SelectMany(r => r)).Distinct().ToList();
}

// قانون دسترسی به یک گذار (دکمه):
// - گذار بدون نقش برای همه کاربران آزاد است
// - گذار دارای نقش فقط برای کاربرانی است که یکی از آن نقش‌ها را دارند (خودش یا با تفویض)
// - نقش Admin به همه گذارها دسترسی دارد (هم‌راستا با PermissionService)؛ این امتیاز تفویض نمی‌شود
// - پس از سررسید کار، نقش ارجاع (Escalation) مرحله هم به همه دکمه‌های آن مرحله دسترسی دارد
public static class BpmsTransitionAccess
{
    public const string AdminRoleName = "Admin";

    public static async Task<BpmsUserRoles> GetUserRolesAsync(
        IApplicationDbContext context,
        string? userId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(userId)) return new BpmsUserRoles(false, []);

        var roles = await RolesOfAsync(context, [userId], cancellationToken);
        var own = roles.Where(r => r.UserId == userId).ToList();

        var now = DateTime.UtcNow;
        var delegators = await context.BpmsDelegations
            .AsNoTracking()
            .Where(d => d.ToUserId == userId && !d.IsRevoked && d.StartDate <= now && d.EndDate >= now)
            .Select(d => d.FromUserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var delegated = delegators.Count == 0
            ? []
            : await RolesOfAsync(context, delegators, cancellationToken);

        return new BpmsUserRoles(own.Any(r => r.Name == AdminRoleName), own.Select(r => r.RoleId).ToList())
        {
            DelegatedRoleIds = delegated
                .GroupBy(r => r.UserId)
                .ToDictionary(g => g.Key, g => (IReadOnlyCollection<string>)g.Select(r => r.RoleId).ToList())
        };
    }

    private static Task<List<UserRoleRow>> RolesOfAsync(
        IApplicationDbContext context, List<string> userIds, CancellationToken cancellationToken) =>
        context.UserRoles
            .AsNoTracking()
            .Where(ur => userIds.Contains(ur.UserId))
            .Join(context.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => new UserRoleRow(ur.UserId, r.Id, r.Name))
            .ToListAsync(cancellationToken);

    private sealed record UserRoleRow(string UserId, string RoleId, string? Name);

    // برای استفاده داخل کوئری‌های EF (بدون لود کردن نقش‌های گذار در حافظه)
    public static Expression<Func<BpmsTransition, bool>> CanExecute(BpmsUserRoles user) =>
        CanExecuteWith(user.IsAdmin, user.AllRoleIds);

    private static Expression<Func<BpmsTransition, bool>> CanExecuteWith(bool isAdmin, IEnumerable<string> roles)
    {
        if (isAdmin) return _ => true;

        var roleIds = roles.ToList();
        return t => !t.AllowedRoles.Any() || t.AllowedRoles.Any(r => roleIds.Contains(r.RoleId));
    }

    // آیا کاربر نقش ارجاع مرحله را (خودش یا با تفویض) دارد؟
    public static bool HoldsEscalationRole(BpmsUserRoles user, BpmsState state) =>
        state.EscalationRoleId != null && (user.IsAdmin || user.AllRoleIds.Contains(state.EscalationRoleId));

    // تشخیص مبنای اجازه برای گذاری که نقش‌هایش لود شده؛ خروجی کاربرِ «از طرفِ» او یا null
    // allowedByEscalation: کار سررسید گذشته است و ارجاع روی همین مرحله اعمال می‌شود
    public static bool TryAuthorize(
        BpmsUserRoles user,
        BpmsTransition transition,
        bool overdue,
        out string? onBehalfOfUserId)
    {
        onBehalfOfUserId = null;
        if (CanExecuteWith(user.IsAdmin, user.RoleIds).Compile()(transition)) return true;

        var escalationRole = overdue ? transition.FromState?.EscalationRoleId : null;
        if (escalationRole != null && user.RoleIds.Contains(escalationRole)) return true;

        foreach (var (delegatorId, roles) in user.DelegatedRoleIds)
        {
            if (CanExecuteWith(false, roles).Compile()(transition) ||
                (escalationRole != null && roles.Contains(escalationRole)))
            {
                onBehalfOfUserId = delegatorId;
                return true;
            }
        }

        return false;
    }
}
