using ERPDotNet.Application.Modules.UserAccess.DTOs;

namespace ERPDotNet.Application.Modules.UserAccess.Interfaces;

public interface IPermissionService
{
    // 1. دریافت درخت کامل مجوزها
    Task<List<PermissionDto>> GetAllPermissionsTreeAsync();

    // 2. محاسبه لیست نهایی برای چک کردن دسترسی (Authorize)
    Task<List<string>> GetUserPermissionsAsync(string userId);
    
    // 3. مدیریت دسترسی‌های نقش
    Task AssignPermissionsToRoleAsync(string roleId, List<int> permissionIds);
    Task<List<int>> GetPermissionsByRoleAsync(string roleId);

    // 4. مدیریت دسترسی‌های ویژه کاربر (ذخیره)
    Task AssignPermissionsToUserAsync(string userId, List<UserPermissionOverrideInput> permissions);
    
    // 5. دریافت جزئیات تفکیک شده (برای نمایش رنگی در درخت) - متد جدید و اصلی
    Task<UserPermissionDetailDto> GetUserPermissionDetailsAsync(string userId);

    // 6. دریافت فقط لیست آیدی‌های مستقیم (متد قدیمی که کنترلر شما هنوز صدا می‌زند) <--- این اضافه شد
    Task<List<int>> GetDirectPermissionsByUserAsync(string userId);

    // 7. کپی دسترسی‌ها
    Task CopyUserPermissionsAsync(string sourceUserId, string targetUserId);
}