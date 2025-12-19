using ERPDotNet.Application.Modules.UserAccess.DTOs;
using ERPDotNet.Application.Modules.UserAccess.Interfaces;
using ERPDotNet.Domain.Modules.UserAccess.Entities;
using ERPDotNet.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Infrastructure.Modules.UserAccess.Services;

public class PermissionService : IPermissionService
{
    private readonly AppDbContext _context;

    public PermissionService(AppDbContext context)
    {
        _context = context;
    }

    // 1. ساخت درخت مجوزها (بدون تغییر)
    public async Task<List<PermissionDto>> GetAllPermissionsTreeAsync()
    {
        var allPermissions = await _context.Permissions.ToListAsync();
        var roots = allPermissions.Where(p => p.ParentId == null).ToList();
        var result = new List<PermissionDto>();

        foreach (var root in roots)
        {
            result.Add(MapToDto(root, allPermissions));
        }

        return result;
    }

    private PermissionDto MapToDto(Permission permission, List<Permission> allPermissions)
    {
        var dto = new PermissionDto
        {
            Id = permission.Id,
            Title = permission.Title,
            Name = permission.Name,
            IsMenu = permission.IsMenu
        };

        var children = allPermissions.Where(p => p.ParentId == permission.Id).ToList();
        
        foreach (var child in children)
        {
            dto.Children.Add(MapToDto(child, allPermissions));
        }

        return dto;
    }

    // 2. فرمول محاسبه دسترسی نهایی کاربر (اصلاح شده با لاجیک پدران ضمنی)
    public async Task<List<string>> GetUserPermissionsAsync(string userId)
    {
        // الف) چک کردن ادمین کل
        var isSuperAdmin = await _context.UserRoles
            .Join(_context.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => new { ur.UserId, RoleName = r.Name })
            .AnyAsync(x => x.UserId == userId && x.RoleName == "Admin");

        if (isSuperAdmin)
        {
            return await _context.Permissions.Select(p => p.Name).ToListAsync();
        }

        // ب) دریافت مجوزهای خام از نقش‌ها (کل آبجکت پرمیشن را می‌گیریم نه فقط اسم)
        var rolePermissions = await _context.UserRoles
            .Where(ur => ur.UserId == userId)
            .Join(_context.RolePermissions, ur => ur.RoleId, rp => rp.RoleId, (ur, rp) => rp.Permission)
            .ToListAsync();

        // ج) دریافت مجوزهای مستقیم کاربر
        var directUserPermissions = await _context.UserPermissions
            .Include(up => up.Permission)
            .Where(up => up.UserId == userId)
            .ToListAsync();

        // د) ساخت لیست اولیه (اعمال Grant و Deny)
        var distinctPermissions = new HashSet<Permission>();
        
        // 1. افزودن پرمیشن‌های نقش
        foreach (var p in rolePermissions) distinctPermissions.Add(p!);

        // 2. اعمال پرمیشن‌های مستقیم (Override)
        foreach (var up in directUserPermissions)
        {
            if (up.IsGranted) 
                distinctPermissions.Add(up.Permission!);
            else 
                distinctPermissions.RemoveWhere(p => p.Id == up.PermissionId);
        }

        // هـ) الگوریتم غنی‌سازی (Enrichment): پیدا کردن تمام پدران
        // تمام پرمیشن‌های سیستم را لود می‌کنیم (چون تعداد کم است، سربار ندارد و سریعتر از ریکرسیو دیتابیس است)
        var allSystemPermissions = await _context.Permissions.AsNoTracking().ToListAsync();
        
        var finalResultNames = new HashSet<string>();

        foreach (var perm in distinctPermissions)
        {
            // 1. خود پرمیشن را اضافه کن
            finalResultNames.Add(perm.Name);

            // 2. پدرانش را پیدا کن و اضافه کن (حرکت به سمت ریشه)
            var current = perm;
            while (current.ParentId != null)
            {
                // پدر را از لیست حافظه پیدا می‌کنیم
                var parent = allSystemPermissions.FirstOrDefault(p => p.Id == current.ParentId);
                if (parent != null)
                {
                    finalResultNames.Add(parent.Name);
                    current = parent; // برو یک پله بالاتر
                }
                else
                {
                    break; // نباید اتفاق بیفتد مگر دیتابیس خراب باشد
                }
            }
        }

        return finalResultNames.ToList();
    }

    // 3. اختصاص دسترسی به نقش (بدون تغییر)
    public async Task AssignPermissionsToRoleAsync(string roleId, List<int> permissionIds)
    {
        var existing = await _context.RolePermissions
            .Where(rp => rp.RoleId == roleId)
            .ToListAsync();
            
        _context.RolePermissions.RemoveRange(existing);

        var newPermissions = permissionIds.Select(pid => new RolePermission
        {
            RoleId = roleId,
            PermissionId = pid
        });

        await _context.RolePermissions.AddRangeAsync(newPermissions);
        await _context.SaveChangesAsync();
    }

    // 4. دریافت دسترسی‌های یک نقش (بدون تغییر)
    public async Task<List<int>> GetPermissionsByRoleAsync(string roleId)
    {
        return await _context.RolePermissions
            .Where(rp => rp.RoleId == roleId)
            .Select(rp => rp.PermissionId)
            .ToListAsync();
    }

    // 1. ذخیره دسترسی مستقیم کاربر
    public async Task AssignPermissionsToUserAsync(string userId, List<UserPermissionOverrideInput> permissions)
    {
        // 1. حذف تمام رکوردهای قبلی این یوزر (پاکسازی کامل)
        var existing = await _context.UserPermissions
            .Where(up => up.UserId == userId)
            .ToListAsync();
            
        _context.UserPermissions.RemoveRange(existing);

        // 2. درج رکوردهای جدید (چه Grant چه Deny)
        if (permissions != null && permissions.Any())
        {
            var newRecords = permissions.Select(p => new UserPermission
            {
                UserId = userId,
                PermissionId = p.PermissionId,
                IsGranted = p.IsGranted
            });

            await _context.UserPermissions.AddRangeAsync(newRecords);
        }

        await _context.SaveChangesAsync();
    }

    // 2. خواندن دسترسی‌های مستقیم کاربر (برای پر کردن درخت)
    public async Task<List<int>> GetDirectPermissionsByUserAsync(string userId)
    {
        return await _context.UserPermissions
            .Where(up => up.UserId == userId && up.IsGranted)
            .Select(up => up.PermissionId)
            .ToListAsync();
    }

    public async Task<UserPermissionDetailDto> GetUserPermissionDetailsAsync(string userId)
    {
        // 1. گرفتن لیست آیدی‌های دسترسی ناشی از نقش‌های کاربر
        var rolePermIds = await _context.UserRoles
            .Where(ur => ur.UserId == userId)
            .Join(_context.RolePermissions, 
                ur => ur.RoleId, 
                rp => rp.RoleId, 
                (ur, rp) => rp.PermissionId)
            .Distinct()
            .ToListAsync();

        // 2. گرفتن لیست تغییرات مستقیم (Override) برای این کاربر
        var userOverrides = await _context.UserPermissions
            .Where(up => up.UserId == userId)
            .Select(up => new UserPermissionOverrideDto 
            { 
                PermissionId = up.PermissionId, 
                IsGranted = up.IsGranted 
            })
            .ToListAsync();

        return new UserPermissionDetailDto
        {
            RolePermissionIds = rolePermIds,
            UserOverrides = userOverrides
        };
    }

    public async Task CopyUserPermissionsAsync(string sourceUserId, string targetUserId)
    {
        // 1. پاکسازی تمام دسترسی‌های قبلی کاربر هدف
        // الف) حذف نقش‌ها
        var targetUserRoles = await _context.UserRoles.Where(ur => ur.UserId == targetUserId).ToListAsync();
        _context.UserRoles.RemoveRange(targetUserRoles);
        
        // ب) حذف پرمیشن‌های ویژه
        var targetUserPerms = await _context.UserPermissions.Where(up => up.UserId == targetUserId).ToListAsync();
        _context.UserPermissions.RemoveRange(targetUserPerms);

        // 2. کپی کردن نقش‌ها
        var sourceRoles = await _context.UserRoles.Where(ur => ur.UserId == sourceUserId).AsNoTracking().ToListAsync();
        var newRoles = sourceRoles.Select(r => new IdentityUserRole<string> 
        { 
            UserId = targetUserId, 
            RoleId = r.RoleId 
        });
        await _context.UserRoles.AddRangeAsync(newRoles);

        // 3. کپی کردن پرمیشن‌های ویژه
        var sourcePerms = await _context.UserPermissions.Where(up => up.UserId == sourceUserId).AsNoTracking().ToListAsync();
        var newPerms = sourcePerms.Select(p => new UserPermission
        {
            UserId = targetUserId,
            PermissionId = p.PermissionId,
            IsGranted = p.IsGranted
        });
        await _context.UserPermissions.AddRangeAsync(newPerms);

        await _context.SaveChangesAsync();
    }
}