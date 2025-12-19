using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Modules.UserAccess.DTOs; // برای UserPermissionOverrideInput
using ERPDotNet.Application.Modules.UserAccess.Interfaces;
using MediatR;

namespace ERPDotNet.Application.Modules.UserAccess.Commands.UpdateUserPermissions;

// این متد باید کش‌های مربوط به دسترسی این کاربر خاص را پاک کند
// اما چون تگ داینامیک (User_123) نداریم، فعلاً کل کش کاربران را پاک می‌کنیم
// در راهکار حرفه‌ای‌تر باید از ICacheService داخل هندلر برای پاک کردن تگ خاص استفاده کنیم.
[CacheInvalidation("Users")] 
public record UpdateUserPermissionsCommand : IRequest<bool>
{
    public required string UserId { get; set; }
    public List<UserPermissionOverrideInput> Permissions { get; set; } = new();
}

public class UpdateUserPermissionsHandler : IRequestHandler<UpdateUserPermissionsCommand, bool>
{
    private readonly IPermissionService _permissionService;

    public UpdateUserPermissionsHandler(IPermissionService permissionService)
    {
        _permissionService = permissionService;
    }

    public async Task<bool> Handle(UpdateUserPermissionsCommand request, CancellationToken cancellationToken)
    {
        // تمام لاجیک پیچیده در سرویس متمرکز شده است
        await _permissionService.AssignPermissionsToUserAsync(request.UserId, request.Permissions);
        return true;
    }
}