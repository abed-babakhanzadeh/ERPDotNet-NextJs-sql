using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Services;

// دسترسی سطح داده به انبار برای کاربر جاری (سخت‌گیرانه)
// - Admin همه انبارها را می‌بیند (null)
// - بقیه فقط انبارهای تخصیص‌یافته؛ کاربر بدون تخصیص به هیچ انباری دسترسی ندارد
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

    public const string NoWarehouseMessage =
        "هیچ انباری به شما تخصیص داده نشده است. از مدیر سیستم بخواهید شما را در «کاربران مجاز» انبار مورد نیازتان قرار دهد.";

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
                _allowed = ids;
            }
        }

        _loaded = true;
        return _allowed;
    }

    public async Task EnsureAccessAsync(int warehouseId, CancellationToken cancellationToken)
    {
        var allowed = await GetAllowedWarehouseIdsAsync(cancellationToken);
        if (allowed == null || allowed.Contains(warehouseId)) return;

        throw new ForbiddenAccessException(allowed.Count == 0
            ? NoWarehouseMessage
            : "شما به این انبار دسترسی ندارید.");
    }
}
