using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Application.Modules.UserAccess.DTOs;

public class RoleDto
{
    public required string Id { get; set; }
    public required string Name { get; set; }
}

public class CreateRoleDto
{
    [Required]
    public required string Name { get; set; }
}