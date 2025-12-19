using ERPDotNet.Domain.Common; // اگر BaseEntity دارید
using System.Collections.Generic;

namespace ERPDotNet.Domain.Modules.UserAccess.Entities;

public class Permission
{
    public int Id { get; set; }
    public required string Name { get; set; } // کد سیستمی: Users.Create
    public required string Title { get; set; } // عنوان فارسی: ایجاد کاربر
    public string? Url { get; set; } // اگر منو باشد، لینک دارد
    public bool IsMenu { get; set; } // آیا در سایدبار نمایش داده شود؟
    
    // ارتباط درختی (Self-Referencing)
    public int? ParentId { get; set; }
    public Permission? Parent { get; set; }
    public ICollection<Permission> Children { get; set; } = new List<Permission>();
}