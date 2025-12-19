namespace ERPDotNet.Application.Modules.UserAccess.DTOs;

public class UserPermissionDetailDto
{
    // لیست آیدی‌هایی که از طریق "نقش" آمده‌اند (برای نمایش خاکستری/پیش‌فرض)
    public List<int> RolePermissionIds { get; set; } = new();

    // لیست تغییرات مستقیم یوزر (هم مثبت هم منفی)
    public List<UserPermissionOverrideDto> UserOverrides { get; set; } = new();
}

public class UserPermissionOverrideDto
{
    public int PermissionId { get; set; }
    public bool IsGranted { get; set; } // True: سبز (ویژه)، False: قرمز (محرومیت)
}