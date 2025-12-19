using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Modules.UserAccess.Commands.UpdateUserPermissions;
using ERPDotNet.Application.Modules.UserAccess.DTOs;
using ERPDotNet.Application.Modules.UserAccess.Interfaces; // برای کوئری‌های ساده هنوز سرویس اوکی است
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

    // دریافت دسترسی‌های خود کاربر (بدون پرمیشن گارد)
    [HttpGet("mine")]
    public async Task<IActionResult> GetMyPermissions()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var permissions = await _permissionService.GetUserPermissionsAsync(userId);
        return Ok(permissions);
    }

    [HttpGet("tree")]
    public async Task<IActionResult> GetAllPermissionsTree()
    {
        var tree = await _permissionService.GetAllPermissionsTreeAsync();
        return Ok(tree);
    }

    // ذخیره دسترسی‌های ویژه (CQRS)
    [HttpPost("assign")]
    [HasPermission("UserAccess.SpecialPermissions")]
    public async Task<IActionResult> AssignPermissions([FromBody] UpdateUserPermissionsCommand command)
    {
        await _mediator.Send(command);
        return Ok(new { message = "دسترسی‌های ویژه ذخیره شد" });
    }

    [HttpGet("user-detail/{userId}")]
    [HasPermission("UserAccess.SpecialPermissions")]
    public async Task<ActionResult<UserPermissionDetailDto>> GetUserPermissionDetails(string userId)
    {
        // این هنوز کوئری نشده، اگر خواستید می‌توانید GetUserPermissionDetailsQuery بسازید
        // اما استفاده مستقیم از سرویس برای Query در کنترلر هم قابل قبول است (Pragmatic Clean Architecture)
        var result = await _permissionService.GetUserPermissionDetailsAsync(userId);
        return Ok(result);
    }
}