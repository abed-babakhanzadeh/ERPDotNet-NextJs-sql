using System.Collections.Generic;

namespace ERPDotNet.Application.Modules.UserAccess.DTOs;

public class UpdateUserPermissionsDto
{
    public required string UserId { get; set; }
    public required List<UserPermissionOverrideInput> Permissions { get; set; }
}