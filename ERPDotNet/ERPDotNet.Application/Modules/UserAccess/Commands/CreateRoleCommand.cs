using ERPDotNet.Application.Common.Attributes;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity;

namespace ERPDotNet.Application.Modules.UserAccess.Commands.CreateRole;

[CacheInvalidation("Roles")] // اگر کش برای نقش‌ها دارید
public record CreateRoleCommand : IRequest<string>
{
    public required string Name { get; set; }
}

public class CreateRoleValidator : AbstractValidator<CreateRoleCommand>
{
    public CreateRoleValidator()
    {
        RuleFor(v => v.Name).NotEmpty().MaximumLength(50).WithMessage("نام نقش الزامی است.");
    }
}

public class CreateRoleHandler : IRequestHandler<CreateRoleCommand, string>
{
    private readonly RoleManager<IdentityRole> _roleManager;

    public CreateRoleHandler(RoleManager<IdentityRole> roleManager)
    {
        _roleManager = roleManager;
    }

    public async Task<string> Handle(CreateRoleCommand request, CancellationToken cancellationToken)
    {
        if (await _roleManager.RoleExistsAsync(request.Name))
        {
            throw new ValidationException("این نقش قبلاً تعریف شده است.");
        }

        var role = new IdentityRole(request.Name);
        var result = await _roleManager.CreateAsync(role);

        if (!result.Succeeded)
        {
            throw new ValidationException(result.Errors.First().Description);
        }

        return role.Id;
    }
}