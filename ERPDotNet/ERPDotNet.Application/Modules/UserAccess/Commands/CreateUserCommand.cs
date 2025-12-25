using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.UserAccess.Entities;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.UserAccess.Commands.CreateUser;

[CacheInvalidation("Users")]
public record CreateUserCommand : IRequest<string>
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
    private readonly IApplicationDbContext _context;
    private readonly UserManager<User> _userManager;

    // تزریق UserManager و DbContext برای چک کردن دیتابیس
    public CreateUserValidator(IApplicationDbContext context, UserManager<User> userManager)
    {
        _context = context;
        _userManager = userManager;

        RuleFor(v => v.FirstName).NotEmpty().MaximumLength(50).WithMessage("نام الزامی است.");
        RuleFor(v => v.LastName).NotEmpty().MaximumLength(50).WithMessage("نام خانوادگی الزامی است.");

        // 1. یکتایی نام کاربری
        RuleFor(v => v.Username)
            .NotEmpty().MinimumLength(4)
            .MustAsync(async (username, token) => await _userManager.FindByNameAsync(username) == null)
            .WithMessage("این نام کاربری قبلاً توسط شخص دیگری انتخاب شده است.");

        // 2. یکتایی ایمیل
        RuleFor(v => v.Email)
            .NotEmpty().EmailAddress()
            .MustAsync(async (email, token) => await _userManager.FindByEmailAsync(email) == null)
            .WithMessage("این ایمیل قبلاً در سیستم ثبت شده است.");

        RuleFor(v => v.Password).NotEmpty().MinimumLength(6).WithMessage("رمز عبور باید حداقل ۶ کاراکتر باشد.");

        // 3. یکتایی کد پرسنلی (اگر پر شده باشد)
        RuleFor(v => v.PersonnelCode)
            .MaximumLength(20)
            .MustAsync(async (code, token) =>
            {
                if (string.IsNullOrEmpty(code)) return true;
                return !await _context.Users.AnyAsync(u => u.PersonnelCode == code, token);
            })
            .WithMessage("این کد پرسنلی قبلاً برای کاربر دیگری ثبت شده است.");

        // 4. یکتایی کد ملی
        RuleFor(v => v.NationalCode)
            .Length(10).When(x => !string.IsNullOrEmpty(x.NationalCode)).WithMessage("کد ملی باید ۱۰ رقم باشد.")
            .MustAsync(async (code, token) =>
            {
                if (string.IsNullOrEmpty(code)) return true;
                return !await _context.Users.AnyAsync(u => u.NationalCode == code, token);
            })
            .WithMessage("این کد ملی قبلاً در سیستم ثبت شده است.");

        // 5. بررسی وجود نقش‌ها
        RuleForEach(v => v.Roles)
            .MustAsync(async (roleName, token) => await _context.Roles.AnyAsync(r => r.Name == roleName, token))
            .WithMessage((cmd, role) => $"نقش '{role}' در سیستم وجود ندارد.");
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

        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new ValidationException($"خطا در ایجاد کاربر: {errors}");
        }

        if (request.Roles.Any())
        {
            // نقش‌های نامعتبر قبلاً توسط Validator فیلتر شده‌اند، پس با خیال راحت اضافه می‌کنیم
            await _userManager.AddToRolesAsync(user, request.Roles);
        }

        return user.Id;
    }
}