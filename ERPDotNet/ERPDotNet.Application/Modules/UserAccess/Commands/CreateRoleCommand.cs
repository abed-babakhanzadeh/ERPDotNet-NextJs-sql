using ERPDotNet.Application.Common.Attributes;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore; // اضافه شده

namespace ERPDotNet.Application.Modules.UserAccess.Commands.CreateRole;

[CacheInvalidation("Roles")]
public record CreateRoleCommand : IRequest<string>
{
    public required string Name { get; set; }
}

public class CreateRoleValidator : AbstractValidator<CreateRoleCommand>
{
    private readonly RoleManager<IdentityRole> _roleManager;

    public CreateRoleValidator(RoleManager<IdentityRole> roleManager)
    {
        _roleManager = roleManager;

        RuleFor(v => v.Name)
            .NotEmpty().MaximumLength(50).WithMessage("نام نقش الزامی است.")
            // انتقال چک تکراری بودن به اینجا
            .MustAsync(async (name, token) => !await _roleManager.RoleExistsAsync(name))
            .WithMessage("این نقش قبلاً در سیستم تعریف شده است.");
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
        // دیگر نیازی به چک تکراری بودن اینجا نیست چون Validator انجام داده
        var role = new IdentityRole(request.Name);
        var result = await _roleManager.CreateAsync(role);

        if (!result.Succeeded)
        {
            throw new ValidationException(result.Errors.First().Description);
        }

        return role.Id;
    }
}