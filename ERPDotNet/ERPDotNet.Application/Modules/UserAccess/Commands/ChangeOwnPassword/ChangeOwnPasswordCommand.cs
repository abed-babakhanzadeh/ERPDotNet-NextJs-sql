using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.UserAccess.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using FluentValidation;

namespace ERPDotNet.Application.Modules.UserAccess.Commands.ChangeOwnPassword;

public record ChangeOwnPasswordCommand : IRequest<bool>
{
    public required string UserId { get; set; } // از توکن استخراج می‌شود
    public required string CurrentPassword { get; set; }
    public required string NewPassword { get; set; }
}

public class ChangeOwnPasswordHandler : IRequestHandler<ChangeOwnPasswordCommand, bool>
{
    private readonly UserManager<User> _userManager;

    public ChangeOwnPasswordHandler(UserManager<User> userManager)
    {
        _userManager = userManager;
    }

    public async Task<bool> Handle(ChangeOwnPasswordCommand request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(request.UserId);
        if (user == null) throw new UnauthorizedAccessException();

        // متد مخصوص Identity برای تغییر رمز با دانستن رمز قبلی
        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);

        if (!result.Succeeded)
        {
            // اگر رمز فعلی اشتباه باشد، Identity ارور PasswordMismatch می‌دهد
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new ValidationException($"خطا در تغییر رمز: {errors}");
        }

        return true;
    }
}