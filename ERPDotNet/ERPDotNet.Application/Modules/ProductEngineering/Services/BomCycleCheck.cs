using ERPDotNet.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.ProductEngineering.Services;

/// <summary>
/// بررسی حلقه در ساختار محصول در همه سطوح (A→B→...→A).
/// اجزای جدید فرمول و جایگزین‌هایشان سطح به سطح در فرمول‌های ثبت‌شده دنبال می‌شوند؛
/// اگر به خود محصول برسیم، حلقه تولید وجود دارد.
/// </summary>
public static class BomCycleCheck
{
    public static async Task<bool> CreatesCycleAsync(
        IApplicationDbContext context,
        int productId,
        IEnumerable<int> componentIds,
        int? excludeBomId,
        CancellationToken token)
    {
        var visited = new HashSet<int>();
        var frontier = componentIds.Where(visited.Add).ToList();

        while (frontier.Count > 0)
        {
            if (frontier.Contains(productId)) return true;

            var lines = context.BOMDetails.AsNoTracking()
                .Where(d => frontier.Contains(d.BOMHeader!.ProductId)
                            && !d.BOMHeader.IsDeleted
                            && (excludeBomId == null || d.BOMHeaderId != excludeBomId));

            var children = await lines.Select(d => d.ChildProductId)
                .Concat(lines.SelectMany(d => d.Substitutes).Select(s => s.SubstituteProductId))
                .Distinct()
                .ToListAsync(token);

            frontier = children.Where(visited.Add).ToList();
        }

        return false;
    }
}
