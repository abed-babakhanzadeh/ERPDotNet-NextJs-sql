public class UpdateRolePermissionsDto
{
    public required string RoleId { get; set; }
    public required List<int> PermissionIds { get; set; } // لیست آیدی‌هایی که تیک خورده‌اند
}