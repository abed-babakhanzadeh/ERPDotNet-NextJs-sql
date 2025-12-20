using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Modules.UserAccess.Commands.CopyUserPermissions;
using ERPDotNet.Application.Modules.UserAccess.Commands.UpdateRolePermissions;
using ERPDotNet.Application.Modules.UserAccess.Commands.UpdateUserPermissions;
using ERPDotNet.Application.Modules.UserAccess.DTOs;
using ERPDotNet.Application.Modules.UserAccess.Interfaces;
using ERPDotNet.Application.Modules.UserAccess.Queries.GetRolePermissions;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ERPDotNet.API.Controllers.UserAccess;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class PermissionsController : ControllerBase
{
    private readonly IPermissionService _permissionService;
    private readonly IMediator _mediator;

    public PermissionsController(IPermissionService permissionService, IMediator mediator)
    {
        _permissionService = permissionService;
        _mediator = mediator;
    }

    // ۱. دریافت دسترسی‌های خود کاربر (برای سایدبار و گارد)
    [HttpGet("mine")]
    public async Task<IActionResult> GetMyPermissions()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var permissions = await _permissionService.GetUserPermissionsAsync(userId);
        return Ok(permissions);
    }

    // ۲. دریافت درخت کامل پرمیشن‌ها (برای مودال انتخاب دسترسی)
    [HttpGet("tree")]
    public async Task<IActionResult> GetAllPermissionsTree()
    {
        var tree = await _permissionService.GetAllPermissionsTreeAsync();
        return Ok(tree);
    }

    // ۳. دریافت جزئیات دسترسی‌های ویژه یک کاربر (تیک‌های سبز و قرمز)
    [HttpGet("user-detail/{userId}")]
    [HasPermission("UserAccess.SpecialPermissions")]
    public async Task<ActionResult<UserPermissionDetailDto>> GetUserPermissionDetails(string userId)
    {
        var result = await _permissionService.GetUserPermissionDetailsAsync(userId);
        return Ok(result);
    }

    // ۴. دریافت لیست ID پرمیشن‌های یک نقش (برای صفحه نقش‌ها)
    [HttpGet("role/{roleId}")]
    [HasPermission("UserAccess.Roles")]
    public async Task<ActionResult<List<int>>> GetRolePermissions(string roleId)
    {
        var result = await _mediator.Send(new GetRolePermissionsQuery(roleId));
        return Ok(result);
    }

    // ۵. ذخیره دسترسی‌های ویژه کاربر
    // نکته مهم: روت باید دقیقا assign-user باشد تا با فرانت مچ شود
    [HttpPost("assign-user")]
    [HasPermission("UserAccess.SpecialPermissions")]
    public async Task<IActionResult> AssignUserPermissions([FromBody] UpdateUserPermissionsCommand command)
    {
        await _mediator.Send(command);
        return Ok(new { message = "دسترسی‌های ویژه کاربر با موفقیت ذخیره شد" });
    }

    // ۶. ذخیره دسترسی‌های نقش
    [HttpPost("assign-role")]
    [HasPermission("UserAccess.Roles.Edit")]
    public async Task<IActionResult> AssignRolePermissions([FromBody] UpdateRolePermissionsCommand command)
    {
        await _mediator.Send(command);
        return Ok(new { message = "دسترسی‌های نقش با موفقیت بروزرسانی شد" });
    }

    // ۷. کپی دسترسی از یک کاربر به کاربر دیگر
    [HttpPost("copy")]
    [HasPermission("UserAccess.SpecialPermissions")]
    public async Task<IActionResult> CopyPermissions([FromBody] CopyUserPermissionsCommand command)
    {
        // خود Mediator و Validator چک می‌کنند که کاربر مبدا و مقصد یکی نباشند
        await _mediator.Send(command);
        return Ok(new { message = "دسترسی‌ها با موفقیت کپی شدند" });
    }
}