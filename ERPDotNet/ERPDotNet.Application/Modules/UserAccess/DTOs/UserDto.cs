using ERPDotNet.Domain.Modules.UserAccess;

namespace ERPDotNet.Application.Modules.UserAccess.DTOs;

public class UserDto
{
    public required string Id { get; set; }
    public required string Username { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string Email { get; set; }
    public string? PersonnelCode { get; set; }
    /// <summary>نام فنی نقش‌ها (برای ویرایش کاربر)</summary>
    public IList<string>? Roles { get; set; }
    /// <summary>عنوان فارسی نقش‌ها، هم‌ترتیب با Roles (برای نمایش)</summary>
    public IList<string> RoleTitles => Roles?.Select(SystemRoles.TitleOf).ToList() ?? new List<string>();
    public bool IsActive { get; set; }
    // فیلدهای اضافه شده برای رفع خطا
    public string? NationalCode { get; init; } 
    public string? ConcurrencyStamp { get; init; } // برای کنترل همروندی

    // تغییر به string برای نمایش تاریخ (یا DateTime اگر فرانت فرمت می‌کند)
    // طبق خطای شما، اینجا string تعریف شده بوده
    public DateTime CreatedAt { get; init; }
}