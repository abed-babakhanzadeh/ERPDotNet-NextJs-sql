using ERPDotNet.Domain.Modules.UserAccess;
using ERPDotNet.Application.Modules.UserAccess.DTOs;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.UserAccess.Queries.GetAllRoles;

public record GetAllRolesQuery : IRequest<List<RoleDto>>;

public class GetAllRolesHandler : IRequestHandler<GetAllRolesQuery, List<RoleDto>>
{
    private readonly RoleManager<IdentityRole> _roleManager;

    public GetAllRolesHandler(RoleManager<IdentityRole> roleManager)
    {
        _roleManager = roleManager;
    }

    public async Task<List<RoleDto>> Handle(GetAllRolesQuery request, CancellationToken cancellationToken)
    {
        var roles = await _roleManager.Roles
            .AsNoTracking()
            .Select(r => new { r.Id, r.Name })
            .ToListAsync(cancellationToken);

        // عنوان در حافظه ساخته می‌شود (ترجمه نقش‌های سیستمی در SQL قابل اجرا نیست)
        return roles
            .Select(r => new RoleDto
            {
                Id = r.Id,
                Name = r.Name!,
                Title = SystemRoles.TitleOf(r.Name),
                IsProtected = SystemRoles.IsProtected(r.Name),
            })
            .OrderBy(r => r.Title)
            .ToList();
    }
}