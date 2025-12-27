using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.UserAccess.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.UserAccess.Commands.UpdateRolePermissions;

[CacheInvalidation("RolePermissions", "UserPermissions")]
public record UpdateRolePermissionsCommand : IRequest<bool>
{
    public required string RoleId { get; set; }
    public required List<int> PermissionIds { get; set; }
}

public class UpdateRolePermissionsValidator : AbstractValidator<UpdateRolePermissionsCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateRolePermissionsValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(v => v.RoleId).NotEmpty()
            .MustAsync(async (id, token) => await _context.Roles.AnyAsync(r => r.Id == id, token))
            .WithMessage("نقش انتخاب شده معتبر نیست.");

        // چک کردن اینکه آیا تمام PermissionId های ارسالی معتبر هستند؟
        RuleFor(v => v.PermissionIds)
            .MustAsync(async (ids, token) => 
            {
                if (!ids.Any()) return true;
                // تعداد IDهای معتبر در دیتابیس باید برابر با تعداد IDهای یونیک ارسالی باشد
                var distinctIds = ids.Distinct().ToList();
                var validCount = await _context.Permissions.CountAsync(p => distinctIds.Contains(p.Id), token);
                return validCount == distinctIds.Count;
            })
            .WithMessage("برخی از دسترسی‌های انتخاب شده در سیستم نامعتبر هستند.");
    }
}

// هندلر نیازی به تغییر خاصی ندارد، همان کد قبلی خوب است
public class UpdateRolePermissionsHandler : IRequestHandler<UpdateRolePermissionsCommand, bool>
{
    // ... (همان کد قبلی)
    // فقط یادتان باشد در هندلر کدها را Replace کنید (اول حذف قبلی‌ها، بعد افزودن جدیدها)
    // که در کد ارسالی خودتان درست بود.
    private readonly IApplicationDbContext _context;

    public UpdateRolePermissionsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateRolePermissionsCommand request, CancellationToken cancellationToken)
    {
         // 1. حذف دسترسی‌های قبلی
        var current = await _context.RolePermissions
            .Where(rp => rp.RoleId == request.RoleId)
            .ToListAsync(cancellationToken);
        
        if(current.Any()) _context.RolePermissions.RemoveRange(current);

        // 2. افزودن جدیدها
        if (request.PermissionIds.Any())
        {
            var newPerms = request.PermissionIds.Distinct().Select(pid => new RolePermission
            {
                RoleId = request.RoleId,
                PermissionId = pid
            });
            await _context.RolePermissions.AddRangeAsync(newPerms, cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}