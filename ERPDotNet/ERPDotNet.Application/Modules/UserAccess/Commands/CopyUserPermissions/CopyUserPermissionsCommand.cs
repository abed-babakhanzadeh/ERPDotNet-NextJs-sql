using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.UserAccess.Entities;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity; // اضافه شد
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.UserAccess.Commands.CopyUserPermissions;

// کش‌های مربوط به پرمیشن و نقش کاربر باید پاک شوند
[CacheInvalidation("UserPermissions", "UserRoles")]
public record CopyUserPermissionsCommand : IRequest<bool>
{
    public required string SourceUserId { get; set; }
    public required string TargetUserId { get; set; }
}

public class CopyUserPermissionsValidator : AbstractValidator<CopyUserPermissionsCommand>
{
    public CopyUserPermissionsValidator()
    {
        RuleFor(v => v.SourceUserId).NotEmpty();
        RuleFor(v => v.TargetUserId).NotEmpty()
            .NotEqual(v => v.SourceUserId).WithMessage("کاربر مبدا و مقصد نمی‌توانند یکسان باشند.");
    }
}

public class CopyUserPermissionsHandler : IRequestHandler<CopyUserPermissionsCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public CopyUserPermissionsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(CopyUserPermissionsCommand request, CancellationToken cancellationToken)
    {
        // 1. دریافت اطلاعات کاربر مبدا (نقش‌ها + دسترسی‌های ویژه)
        var sourceRoles = await _context.UserRoles
            .Where(ur => ur.UserId == request.SourceUserId)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var sourcePermissions = await _context.UserPermissions
            .Where(up => up.UserId == request.SourceUserId)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        // 2. پاک‌سازی کامل کاربر مقصد (نقش‌های قبلی + دسترسی‌های قبلی)
        var targetRoles = await _context.UserRoles
            .Where(ur => ur.UserId == request.TargetUserId)
            .ToListAsync(cancellationToken);

        var targetPermissions = await _context.UserPermissions
            .Where(up => up.UserId == request.TargetUserId)
            .ToListAsync(cancellationToken);

        if (targetRoles.Any()) _context.UserRoles.RemoveRange(targetRoles);
        if (targetPermissions.Any()) _context.UserPermissions.RemoveRange(targetPermissions);

        // 3. کپی کردن نقش‌ها
        if (sourceRoles.Any())
        {
            var newRoles = sourceRoles.Select(r => new IdentityUserRole<string>
            {
                UserId = request.TargetUserId,
                RoleId = r.RoleId
            });
            await _context.UserRoles.AddRangeAsync(newRoles, cancellationToken);
        }

        // 4. کپی کردن دسترسی‌های ویژه
        if (sourcePermissions.Any())
        {
            var newPermissions = sourcePermissions.Select(sp => new UserPermission
            {
                UserId = request.TargetUserId,
                PermissionId = sp.PermissionId,
                IsGranted = sp.IsGranted
            });
            await _context.UserPermissions.AddRangeAsync(newPermissions, cancellationToken);
        }

        // 5. ذخیره نهایی
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}