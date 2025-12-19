using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Application.Modules.UserAccess.DTOs;

public class UpdateUserDto
{
    [Required]
    public required string FirstName { get; set; }
    [Required]
    public required string LastName { get; set; }
    [Required]
    [EmailAddress]
    public required string Email { get; set; }
    public string? PersonnelCode { get; set; }
    
    public List<string> Roles { get; set; } = new(); // برای تغییر نقش
    public bool IsActive { get; set; } // برای فعال/غیرفعال کردن
}