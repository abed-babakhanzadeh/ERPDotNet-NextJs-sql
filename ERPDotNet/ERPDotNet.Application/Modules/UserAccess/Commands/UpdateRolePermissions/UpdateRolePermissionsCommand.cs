using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.UserAccess.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.UserAccess.Commands.UpdateRolePermissions;

// وقتی دسترسی یک نقش تغییر می‌کند، باید کش دسترسی‌ها پاک شود تا کاربران تغییرات را حس کنند
[CacheInvalidation("RolePermissions", "UserPermissions")]
public record UpdateRolePermissionsCommand : IRequest<bool>
{
    public required string RoleId { get; set; }
    public required List<int> PermissionIds { get; set; }
}

public class UpdateRolePermissionsValidator : AbstractValidator<UpdateRolePermissionsCommand>
{
    public UpdateRolePermissionsValidator()
    {
        RuleFor(v => v.RoleId).NotEmpty();
        RuleFor(v => v.PermissionIds).NotNull();
    }
}

public class UpdateRolePermissionsHandler : IRequestHandler<UpdateRolePermissionsCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateRolePermissionsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateRolePermissionsCommand request, CancellationToken cancellationToken)
    {
        // 1. بررسی وجود نقش
        var roleExists = await _context.Roles.AnyAsync(r => r.Id == request.RoleId, cancellationToken);
        if (!roleExists)
            throw new KeyNotFoundException("نقش مورد نظر یافت نشد.");

        // 2. حذف تمام دسترسی‌های فعلی این نقش (Clear existing permissions)
        var currentPermissions = await _context.RolePermissions
            .Where(rp => rp.RoleId == request.RoleId)
            .ToListAsync(cancellationToken);

        if (currentPermissions.Any())
        {
            _context.RolePermissions.RemoveRange(currentPermissions);
        }

        // 3. افزودن دسترسی‌های جدید
        if (request.PermissionIds.Any())
        {
            // حذف تکراری‌ها جهت اطمینان
            var distinctIds = request.PermissionIds.Distinct();

            var newPermissions = distinctIds.Select(permId => new RolePermission
            {
                RoleId = request.RoleId,
                PermissionId = permId
            });

            await _context.RolePermissions.AddRangeAsync(newPermissions, cancellationToken);
        }

        // 4. ذخیره تغییرات
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}