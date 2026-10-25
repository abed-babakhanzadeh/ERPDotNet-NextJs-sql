using ERPDotNet.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Queries.GetWarehouseUsers;

/// <param name="IsAllowed">این انبار به کاربر تخصیص داده شده</param>
/// <param name="AssignedWarehouses">تعداد کل انبارهای تخصیص‌یافته به کاربر؛ صفر یعنی بدون محدودیت</param>
public record WarehouseUserDto(string Id, string FullName, string UserName, bool IsAllowed, int AssignedWarehouses);

/// <summary>کاربران فعال با وضعیت دسترسی به یک انبار</summary>
public record GetWarehouseUsersQuery(int WarehouseId) : IRequest<List<WarehouseUserDto>>;

public class GetWarehouseUsersHandler : IRequestHandler<GetWarehouseUsersQuery, List<WarehouseUserDto>>
{
    private readonly IApplicationDbContext _context;

    public GetWarehouseUsersHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<WarehouseUserDto>> Handle(GetWarehouseUsersQuery request, CancellationToken cancellationToken)
    {
        return await _context.Users
            .AsNoTracking()
            .Where(u => u.IsActive && !u.IsDeleted)
            .OrderBy(u => u.LastName).ThenBy(u => u.FirstName)
            .Select(u => new WarehouseUserDto(
                u.Id,
                (u.FirstName + " " + u.LastName).Trim(),
                u.UserName ?? u.Id,
                _context.WarehouseUserAccesses.Any(a => a.UserId == u.Id && a.WarehouseId == request.WarehouseId),
                _context.WarehouseUserAccesses.Count(a => a.UserId == u.Id)))
            .ToListAsync(cancellationToken);
    }
}
