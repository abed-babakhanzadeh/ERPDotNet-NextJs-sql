using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Domain.Modules.UserAccess.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using FluentValidation;

namespace ERPDotNet.Application.Modules.UserAccess.Commands.ChangePassword;

// پاک کردن کش کاربران (اگر لیست کاربران را جایی کش کرده‌اید)
[CacheInvalidation("Users")] 
public record ChangeUserPasswordCommand : IRequest<bool>
{
    public required string UserId { get; set; }
    public required string NewPassword { get; set; }
}

public class ChangeUserPasswordValidator : AbstractValidator<ChangeUserPasswordCommand>
{
    public ChangeUserPasswordValidator()
    {
        RuleFor(v => v.UserId).NotEmpty().WithMessage("شناسه کاربر نامعتبر است.");

        RuleFor(v => v.NewPassword)
            .NotEmpty().WithMessage("رمز عبور جدید الزامی است.")
            .MinimumLength(6).WithMessage("رمز عبور باید حداقل ۶ کاراکتر باشد.");
    }
}

public class ChangeUserPasswordHandler : IRequestHandler<ChangeUserPasswordCommand, bool>
{
    private readonly UserManager<User> _userManager;

    public ChangeUserPasswordHandler(UserManager<User> userManager)
    {
        _userManager = userManager;
    }

    public async Task<bool> Handle(ChangeUserPasswordCommand request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(request.UserId);

        if (user == null)
        {
            throw new KeyNotFoundException($"کاربری با شناسه {request.UserId} یافت نشد.");
        }

        // روش استاندارد Identity برای ریست پسورد توسط ادمین:
        // 1. تولید توکن ریست (چون ادمین پسورد قبلی را نمی‌داند)
        var token = await _userManager.GeneratePasswordResetTokenAsync(user);

        // 2. اعمال پسورد جدید با استفاده از توکن
        var result = await _userManager.ResetPasswordAsync(user, token, request.NewPassword);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new ValidationException($"خطا در تغییر رمز عبور: {errors}");
        }

        // آپدیت کردن SecurityStamp باعث می‌شود سشن‌های فعال کاربر (اگر لاگین باشد) نامعتبر شوند 
        // و کاربر مجبور شود دوباره لاگین کند (امنیتی)
        await _userManager.UpdateSecurityStampAsync(user);

        return true;
    }
}