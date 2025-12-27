using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Domain.Modules.UserAccess.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Application.Modules.UserAccess.Commands.ChangePassword;

// این اتریبیوت اختیاری است، اما اگر لیست کاربران را کش می‌کنید، بهتر است کش را پاک کنید
[CacheInvalidation("Users")] 
public record ChangeUserPasswordCommand : IRequest<bool>
{
    public required string UserId { get; set; } // با توجه به IdentityUser، آی‌دی استرینگ است
    public required string NewPassword { get; set; }
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
        // و کاربر مجبور به لاگین مجدد شود (امنیت بیشتر)
        await _userManager.UpdateSecurityStampAsync(user);

        return true;
    }
}