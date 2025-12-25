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

public class ChangeOwnPasswordValidator : AbstractValidator<ChangeOwnPasswordCommand>
{
    public ChangeOwnPasswordValidator()
    {
        RuleFor(v => v.CurrentPassword)
            .NotEmpty().WithMessage("وارد کردن رمز عبور فعلی الزامی است.");

        RuleFor(v => v.NewPassword)
            .NotEmpty().WithMessage("وارد کردن رمز عبور جدید الزامی است.")
            .MinimumLength(6).WithMessage("رمز عبور جدید باید حداقل ۶ کاراکتر باشد.")
            .NotEqual(v => v.CurrentPassword).WithMessage("رمز عبور جدید نمی‌تواند با رمز عبور فعلی یکسان باشد.");
    }
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
            // ترجمه خطاهای رایج Identity به فارسی
            var errors = result.Errors.Select(e =>
            {
                if (e.Code == "PasswordMismatch") return "رمز عبور فعلی اشتباه است.";
                if (e.Code == "PasswordTooShort") return "رمز عبور جدید خیلی کوتاه است.";
                return e.Description;
            });
            
            throw new ValidationException(string.Join(" | ", errors));
        }

        return true;
    }
}