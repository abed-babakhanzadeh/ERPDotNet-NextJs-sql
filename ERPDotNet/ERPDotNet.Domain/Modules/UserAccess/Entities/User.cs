using Microsoft.AspNetCore.Identity;
using System;

namespace ERPDotNet.Domain.Modules.UserAccess.Entities;

// ارث‌بری از IdentityUser یعنی: نام‌کاربری، ایمیل، پسورد هش‌شده، موبایل و... را خودکار دارد.
public class User : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;

    // فیلدهای ERP
    public string? PersonnelCode { get; set; } // کد پرسنلی
    public string? NationalCode { get; set; }  // کد ملی
    public bool IsActive { get; set; } = true; // برای بستن دسترسی بدون حذف یوزر

    // فیلدهای Audit (چون نمی‌توانیم از BaseEntity ارث ببریم - سی شارپ ارث‌بری چندگانه ندارد)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
}
