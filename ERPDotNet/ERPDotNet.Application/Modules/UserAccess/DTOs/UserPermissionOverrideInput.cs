namespace ERPDotNet.Application.Modules.UserAccess.DTOs;

public class UserPermissionOverrideInput
{
    public int PermissionId { get; set; }
    public bool IsGranted { get; set; } // true: grant, false: deny
}