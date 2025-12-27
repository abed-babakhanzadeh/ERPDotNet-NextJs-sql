using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Modules.UserAccess.DTOs;
using ERPDotNet.Domain.Modules.UserAccess.Entities;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity;

namespace ERPDotNet.Application.Modules.UserAccess.Commands.CreateUser;

[CacheInvalidation("Users")] // لیست کاربران کش شده را پاک کن
public record CreateUserCommand : IRequest<string> // برگرداندن ID کاربر
{
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string Username { get; set; }
    public required string Email { get; set; }
    public required string Password { get; set; }
    public string? PersonnelCode { get; set; }
    public string? NationalCode { get; set; }
    public List<string> Roles { get; set; } = new();
}

public class CreateUserValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserValidator()
    {
        RuleFor(v => v.FirstName).NotEmpty().MaximumLength(50);
        RuleFor(v => v.LastName).NotEmpty().MaximumLength(50);
        RuleFor(v => v.Username).NotEmpty().MinimumLength(4);
        RuleFor(v => v.Email).NotEmpty().EmailAddress();
        RuleFor(v => v.Password).NotEmpty().MinimumLength(6).WithMessage("رمز عبور باید حداقل ۶ کاراکتر باشد.");
    }
}

public class CreateUserHandler : IRequestHandler<CreateUserCommand, string>
{
    private readonly UserManager<User> _userManager;

    public CreateUserHandler(UserManager<User> userManager)
    {
        _userManager = userManager;
    }

    public async Task<string> Handle(CreateUserCommand request, CancellationToken cancellationToken)
    {
        var user = new User
        {
            UserName = request.Username,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            PersonnelCode = request.PersonnelCode,
            NationalCode = request.NationalCode,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        // 1. ایجاد کاربر (پسورد خودکار هش می‌شود)
        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new ValidationException($"خطا در ایجاد کاربر: {errors}");
        }

        // 2. تخصیص نقش‌ها
        if (request.Roles.Any())
        {
            var roleResult = await _userManager.AddToRolesAsync(user, request.Roles);
            if (!roleResult.Succeeded)
            {
                // لاگ کردن خطا (کاربر ساخته شده ولی نقش نگرفته)
            }
        }

        return user.Id;
    }
}