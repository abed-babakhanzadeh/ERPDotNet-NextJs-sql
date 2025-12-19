namespace ERPDotNet.Application.Modules.UserAccess.DTOs;

public class PermissionDto
{
    public int Id { get; set; }
    public required string Title { get; set; } // عنوان فارسی (نمایش در درخت)
    public required string Name { get; set; }  // کد سیستمی (برای چک کردن در کد)
    public bool IsMenu { get; set; }
    
    // برای ساختار درختی
    public List<PermissionDto> Children { get; set; } = new();
}