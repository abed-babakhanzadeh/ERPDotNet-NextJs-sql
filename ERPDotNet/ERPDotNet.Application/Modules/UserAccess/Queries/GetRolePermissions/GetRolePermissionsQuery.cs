using ERPDotNet.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.UserAccess.Queries.GetRolePermissions;

public record GetRolePermissionsQuery(string RoleId) : IRequest<List<int>>;

public class GetRolePermissionsHandler : IRequestHandler<GetRolePermissionsQuery, List<int>>
{
    private readonly IApplicationDbContext _context;

    public GetRolePermissionsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<int>> Handle(GetRolePermissionsQuery request, CancellationToken cancellationToken)
    {
        // دریافت لیست ID پرمیشن‌هایی که به این نقش اختصاص داده شده
        return await _context.RolePermissions
            .Where(rp => rp.RoleId == request.RoleId)
            .Select(rp => rp.PermissionId)
            .ToListAsync(cancellationToken);
    }
}