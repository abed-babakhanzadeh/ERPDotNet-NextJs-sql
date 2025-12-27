using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Modules.UserAccess.Interfaces;
using MediatR;

namespace ERPDotNet.Application.Modules.UserAccess.Commands.DeleteUser;

[CacheInvalidation("Users")] // پاک کردن کش کاربران پس از حذف
public record DeleteUserCommand(string Id) : IRequest<bool>;

public class DeleteUserHandler : IRequestHandler<DeleteUserCommand, bool>
{
    private readonly IIdentityService _identityService;

    public DeleteUserHandler(IIdentityService identityService)
    {
        _identityService = identityService;
    }

    public async Task<bool> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
    {
        // استفاده از سرویس IIdentityService که قبلاً ساختیم
        var success = await _identityService.DeleteUserAsync(request.Id);

        if (!success)
        {
            // اگر کاربر پیدا نشد یا حذف نشد، خطا برمی‌گردانیم
            throw new KeyNotFoundException($"کاربر با شناسه {request.Id} یافت نشد.");
        }

        return true;
    }
}