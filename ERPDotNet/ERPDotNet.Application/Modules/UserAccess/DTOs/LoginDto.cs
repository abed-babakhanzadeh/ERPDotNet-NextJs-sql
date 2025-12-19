using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Application.Modules.UserAccess.DTOs;

public class LoginDto
{
    [Required]
    public required string Username { get; set; } = string.Empty;

    [Required]
    public required string Password { get; set; } = string.Empty;
}