using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Modules.UserAccess.Commands.CreateRole;
using ERPDotNet.Application.Modules.UserAccess.Commands.DeleteRole;
using ERPDotNet.Application.Modules.UserAccess.DTOs;
using ERPDotNet.Application.Modules.UserAccess.Queries.GetAllRoles;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.Controllers.UserAccess;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly IMediator _mediator;

    public RolesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // دریافت لیست نقش‌ها
    [HttpGet]
    [HasPermission("UserAccess.Roles")]
    public async Task<ActionResult<IEnumerable<RoleDto>>> GetAll()
    {
        var result = await _mediator.Send(new GetAllRolesQuery());
        return Ok(result);
    }

    // ایجاد نقش جدید
    [HttpPost]
    [HasPermission("UserAccess.Roles.Create")]
    public async Task<IActionResult> Create([FromBody] CreateRoleCommand command)
    {
        var roleId = await _mediator.Send(command);
        return Ok(new { message = "نقش جدید با موفقیت ایجاد شد", id = roleId });
    }

    // حذف نقش
    [HttpDelete("{id}")]
    [HasPermission("UserAccess.Roles.Delete")]
    public async Task<IActionResult> Delete(string id)
    {
        await _mediator.Send(new DeleteRoleCommand(id));
        return NoContent();
    }
}