using ERPDotNet.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Workflow.Commands;

internal static class TransitionRoleRules
{
    public const string UnknownRoleMessage = "یک یا چند نقش انتخاب‌شده در سیستم وجود ندارد.";

    public static async Task<bool> AllExistAsync(IApplicationDbContext context, List<string>? roleIds, CancellationToken cancellationToken)
    {
        if (roleIds == null || roleIds.Count == 0) return true;

        var distinct = roleIds.Distinct().ToList();
        var found = await context.Roles.CountAsync(r => distinct.Contains(r.Id), cancellationToken);
        return found == distinct.Count;
    }
}
