using ERPDotNet.Application.Common.Attributes;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity;

namespace ERPDotNet.Application.Modules.UserAccess.Commands.DeleteRole;

[CacheInvalidation("Roles")]
public record DeleteRoleCommand(string Id) : IRequest<bool>;

public class DeleteRoleHandler : IRequestHandler<DeleteRoleCommand, bool>
{
    private readonly RoleManager<IdentityRole> _roleManager;

    public DeleteRoleHandler(RoleManager<IdentityRole> roleManager)
    {
        _roleManager = roleManager;
    }

    public async Task<bool> Handle(DeleteRoleCommand request, CancellationToken cancellationToken)
    {
        var role = await _roleManager.FindByIdAsync(request.Id);
        if (role == null) throw new KeyNotFoundException("نقش یافت نشد.");

        if (role.Name == "Admin" || role.Name == "User")
        {
            throw new ValidationException("حذف نقش‌های سیستمی مجاز نیست.");
        }

        var result = await _roleManager.DeleteAsync(role);
        if (!result.Succeeded)
        {
            throw new ValidationException(result.Errors.First().Description);
        }

        return true;
    }
}