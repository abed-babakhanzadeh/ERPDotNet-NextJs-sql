namespace ERPDotNet.Application.Modules.UserAccess.DTOs;

public class UserDto
{
    public required string Id { get; set; }
    public required string Username { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string Email { get; set; }
    public string? PersonnelCode { get; set; }
    public IList<string>? Roles { get; set; }
    public bool IsActive { get; set; }
    // فیلدهای اضافه شده برای رفع خطا
    public string? NationalCode { get; init; } 
    public string? ConcurrencyStamp { get; init; } // برای کنترل همروندی

    // تغییر به string برای نمایش تاریخ (یا DateTime اگر فرانت فرمت می‌کند)
    // طبق خطای شما، اینجا string تعریف شده بوده
    public DateTime CreatedAt { get; init; }
}