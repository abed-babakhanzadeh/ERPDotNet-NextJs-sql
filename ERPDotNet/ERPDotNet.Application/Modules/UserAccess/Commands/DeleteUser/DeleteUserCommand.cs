using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces; // اضافه شده برای ICurrentUserService
using ERPDotNet.Application.Modules.UserAccess.Interfaces;
using FluentValidation; // اضافه شده
using MediatR;

namespace ERPDotNet.Application.Modules.UserAccess.Commands.DeleteUser;

[CacheInvalidation("Users")]
public record DeleteUserCommand(string Id) : IRequest<bool>;

public class DeleteUserHandler : IRequestHandler<DeleteUserCommand, bool>
{
    private readonly IIdentityService _identityService;
    private readonly ICurrentUserService _currentUserService; // سرویس کاربر جاری

    public DeleteUserHandler(IIdentityService identityService, ICurrentUserService currentUserService)
    {
        _identityService = identityService;
        _currentUserService = currentUserService;
    }

    public async Task<bool> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
    {
        // 1. جلوگیری از حذف خود
        if (request.Id == _currentUserService.UserId)
        {
            throw new ValidationException("شما نمی‌توانید حساب کاربری خودتان را حذف کنید.");
        }

        // 2. جلوگیری از حذف کاربر Admin پیش‌فرض (معمولا با نام کاربری admin چک می‌شود یا ID ثابت)
        // اینجا فرض بر چک کردن نام کاربری است، باید متدش را در سرویس داشته باشید یا ID چک کنید
        // اگر IIdentityService متد GetUserNameAsync دارد:
        var username = await _identityService.GetUserNameAsync(request.Id);
        if (username?.ToLower() == "admin")
        {
             throw new ValidationException("حذف کاربر مدیر سیستم (admin) مجاز نیست.");
        }

        var success = await _identityService.DeleteUserAsync(request.Id);

        if (!success)
        {
            throw new KeyNotFoundException($"کاربر با شناسه {request.Id} یافت نشد.");
        }

        return true;
    }
}