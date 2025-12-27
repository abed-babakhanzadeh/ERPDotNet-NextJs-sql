using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces; // اضافه شده
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore; // اضافه شده
using ERPDotNet.Domain.Modules.UserAccess.Entities;

namespace ERPDotNet.Application.Modules.UserAccess.Commands.UpdateUser;

[CacheInvalidation("Users")]
public record UpdateUserCommand : IRequest<bool>
{
    public required string Id { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string Email { get; set; }
    public string? PersonnelCode { get; set; }
    public string? NationalCode { get; set; }
    public bool IsActive { get; set; }
    public List<string> Roles { get; set; } = new();
    public string? ConcurrencyStamp { get; set; }
}

public class UpdateUserValidator : AbstractValidator<UpdateUserCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateUserValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(v => v.Id).NotEmpty();
        RuleFor(v => v.FirstName).NotEmpty().MaximumLength(50);
        RuleFor(v => v.LastName).NotEmpty().MaximumLength(50);
        
        // چک یکتایی ایمیل (غیر از خودش)
        RuleFor(v => v.Email)
            .NotEmpty().EmailAddress()
            .MustAsync(async (model, email, token) => 
            {
                return !await _context.Users.AnyAsync(u => u.Email == email && u.Id != model.Id, token);
            })
            .WithMessage("این ایمیل قبلاً توسط کاربر دیگری استفاده شده است.");

        // چک یکتایی کد پرسنلی (غیر از خودش)
        RuleFor(v => v.PersonnelCode)
            .MustAsync(async (model, code, token) =>
            {
                if (string.IsNullOrEmpty(code)) return true;
                return !await _context.Users.AnyAsync(u => u.PersonnelCode == code && u.Id != model.Id, token);
            })
            .WithMessage("این کد پرسنلی متعلق به کاربر دیگری است.");

        // چک یکتایی کد ملی (غیر از خودش)
        RuleFor(v => v.NationalCode)
            .Length(10).When(x => !string.IsNullOrEmpty(x.NationalCode))
            .MustAsync(async (model, code, token) =>
            {
                if (string.IsNullOrEmpty(code)) return true;
                return !await _context.Users.AnyAsync(u => u.NationalCode == code && u.Id != model.Id, token);
            })
            .WithMessage("این کد ملی متعلق به کاربر دیگری است.");
    }
}

public class UpdateUserHandler : IRequestHandler<UpdateUserCommand, bool>
{
    private readonly UserManager<User> _userManager;

    public UpdateUserHandler(UserManager<User> userManager)
    {
        _userManager = userManager;
    }

    public async Task<bool> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(request.Id);
        if (user == null) return false;

        // چک همروندی
        if (request.ConcurrencyStamp != null && user.ConcurrencyStamp != request.ConcurrencyStamp)
        {
            throw new Exception("اطلاعات کاربر توسط شخص دیگری تغییر یافته است. لطفاً صفحه را رفرش کنید.");
        }

        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.Email = request.Email;
        user.PersonnelCode = request.PersonnelCode;
        user.NationalCode = request.NationalCode;
        user.IsActive = request.IsActive;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            throw new ValidationException(result.Errors.First().Description);
        }

        // مدیریت نقش‌ها
        var currentRoles = await _userManager.GetRolesAsync(user);
        var rolesToAdd = request.Roles.Except(currentRoles).ToList();
        var rolesToRemove = currentRoles.Except(request.Roles).ToList();

        if (rolesToAdd.Any()) await _userManager.AddToRolesAsync(user, rolesToAdd);
        if (rolesToRemove.Any()) await _userManager.RemoveFromRolesAsync(user, rolesToRemove);

        return true;
    }
}