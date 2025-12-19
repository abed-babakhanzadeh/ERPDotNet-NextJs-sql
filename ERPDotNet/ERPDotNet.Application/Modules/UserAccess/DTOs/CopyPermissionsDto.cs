namespace ERPDotNet.Application.Modules.UserAccess.DTOs;

public class CopyPermissionsDto
{
    public required string SourceUserId { get; set; } // کاربری که از رویش کپی می‌کنیم
    public required string TargetUserId { get; set; } // کاربری که داریم ویرایشش می‌کنیم
}