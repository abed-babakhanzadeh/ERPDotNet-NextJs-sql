using Microsoft.AspNetCore.Identity;

namespace ERPDotNet.Domain.Modules.UserAccess.Entities;

public class RolePermission
{
    // این کلاس خودش Id ندارد چون جدول واسط است (Composite Key)
    public required string RoleId { get; set; }
    public int PermissionId { get; set; }

    // Navigation Properties
    public IdentityRole? Role { get; set; }
    public Permission? Permission { get; set; }
}