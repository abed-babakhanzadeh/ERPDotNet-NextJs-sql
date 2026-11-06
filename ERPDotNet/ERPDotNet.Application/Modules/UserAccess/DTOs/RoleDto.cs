using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Application.Modules.UserAccess.DTOs;

public class RoleDto
{
    public required string Id { get; set; }
    /// <summary>نام فنی نقش (کلید ثابت؛ برای تخصیص به کاربر و بررسی دسترسی)</summary>
    public required string Name { get; set; }
    /// <summary>عنوان نمایشی فارسی (نقش‌های سیستمی ترجمه می‌شوند، بقیه همان نام)</summary>
    public required string Title { get; set; }
    /// <summary>نقش سیستمی حذف‌نشدنی (مدیر سیستم، کاربر عادی)</summary>
    public bool IsProtected { get; set; }
}

public class CreateRoleDto
{
    [Required]
    public required string Name { get; set; }
}