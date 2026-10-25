using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Services;

// دسترسی سطح داده به انبار برای کاربر جاری
// - Admin و کاربری که هیچ انباری به او تخصیص داده نشده همه انبارها را می‌بینند (null)
// - با اولین تخصیص، فقط انبارهای تخصیص‌یافته در دسترس‌اند
public interface IWarehouseAccessService
{
    /// <summary>شناسه انبارهای مجاز؛ null یعنی بدون محدودیت</summary>
    Task<IReadOnlyCollection<int>?> GetAllowedWarehouseIdsAsync(CancellationToken cancellationToken);

    /// <summary>اگر کاربر به انبار دسترسی نداشته باشد خطای 403 می‌دهد</summary>
    Task EnsureAccessAsync(int warehouseId, CancellationToken cancellationToken);
}

public class WarehouseAccessService : IWarehouseAccessService
{
    private const string AdminRoleName = "Admin";

    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private IReadOnlyCollection<int>? _allowed;
    private bool _loaded;

    public WarehouseAccessService(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyCollection<int>?> GetAllowedWarehouseIdsAsync(CancellationToken cancellationToken)
    {
        if (_loaded) return _allowed;

        var userId = _currentUser.UserId;
        // درخواست‌های سیستمی (بدون کاربر) محدود نمی‌شوند؛ احراز هویت را لایه API تضمین می‌کند
        if (!string.IsNullOrEmpty(userId))
        {
            var isAdmin = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .Join(_context.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
                .AnyAsync(name => name == AdminRoleName, cancellationToken);

            if (!isAdmin)
            {
                var ids = await _context.WarehouseUserAccesses
                    .AsNoTracking()
                    .Where(a => a.UserId == userId)
                    .Select(a => a.WarehouseId)
                    .ToListAsync(cancellationToken);
                _allowed = ids.Count == 0 ? null : ids;
            }
        }

        _loaded = true;
        return _allowed;
    }

    public async Task EnsureAccessAsync(int warehouseId, CancellationToken cancellationToken)
    {
        var allowed = await GetAllowedWarehouseIdsAsync(cancellationToken);
        if (allowed != null && !allowed.Contains(warehouseId))
            throw new ForbiddenAccessException("شما به این انبار دسترسی ندارید.");
    }
}
