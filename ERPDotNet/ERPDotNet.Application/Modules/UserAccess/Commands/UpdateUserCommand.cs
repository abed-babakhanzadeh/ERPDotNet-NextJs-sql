using ERPDotNet.Application.Common.Attributes;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity;
using ERPDotNet.Domain.Modules.UserAccess.Entities;

namespace ERPDotNet.Application.Modules.UserAccess.Commands.UpdateUser;

[CacheInvalidation("Users")]
public record UpdateUserCommand : IRequest<bool>
{
    public required string Id { get; set; } // GUID
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string Email { get; set; }
    public string? PersonnelCode { get; set; }
    public string? NationalCode { get; set; }
    public bool IsActive { get; set; }
    public List<string> Roles { get; set; } = new();

    // === کنترل همروندی ===
    // در Identity این فیلد string است (GUID) نه byte[]
    public string? ConcurrencyStamp { get; set; } 
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

        // 1. چک کردن همروندی
        if (request.ConcurrencyStamp != null && user.ConcurrencyStamp != request.ConcurrencyStamp)
        {
            throw new Exception("اطلاعات کاربر توسط شخص دیگری تغییر یافته است. لطفاً رفرش کنید.");
        }

        // 2. آپدیت فیلدها
        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.Email = request.Email;
        user.PersonnelCode = request.PersonnelCode;
        user.NationalCode = request.NationalCode;
        user.IsActive = request.IsActive;

        // 3. ذخیره تغییرات (Identity خودش ConcurrencyStamp را آپدیت می‌کند)
        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            throw new ValidationException(result.Errors.First().Description);
        }

        // 4. مدیریت نقش‌ها (حذف قبلی‌ها و افزودن جدیدها)
        var currentRoles = await _userManager.GetRolesAsync(user);
        var rolesToAdd = request.Roles.Except(currentRoles).ToList();
        var rolesToRemove = currentRoles.Except(request.Roles).ToList();

        if (rolesToAdd.Any()) await _userManager.AddToRolesAsync(user, rolesToAdd);
        if (rolesToRemove.Any()) await _userManager.RemoveFromRolesAsync(user, rolesToRemove);

        return true;
    }
}