using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.UserAccess.Commands.CreateUser;
using ERPDotNet.Application.Modules.UserAccess.Commands.UpdateUser;
using ERPDotNet.Application.Modules.UserAccess.Commands.DeleteUser; // فرض: باید ساخته شود
using ERPDotNet.Application.Modules.UserAccess.Queries.GetAllUsers;
using ERPDotNet.Application.Modules.UserAccess.Queries.GetUserById;
using ERPDotNet.Application.Modules.UserAccess.DTOs;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.Controllers.UserAccess;

[Route("api/[controller]")]
[ApiController]
[HasPermission("UserAccess")] // سطح دسترسی پایه ماژول
public class UsersController : ControllerBase
{
    private readonly IMediator _mediator;

    public UsersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("search")] // استاندارد جدید برای ارسال فیلترها در Body
    [HasPermission("UserAccess.View")]
    public async Task<ActionResult<PaginatedResult<UserDto>>> GetAll([FromBody] GetAllUsersQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    [HttpGet("{id}")]
    [HasPermission("UserAccess.View")]
    public async Task<ActionResult<UserDto>> GetById(string id)
    {
        var user = await _mediator.Send(new GetUserByIdQuery(id));
        if (user == null) return NotFound();
        return Ok(user);
    }

    [HttpPost]
    [HasPermission("UserAccess.Create")]
    public async Task<ActionResult<string>> Create([FromBody] CreateUserCommand command)
    {
        var userId = await _mediator.Send(command);
        return Ok(new { id = userId });
    }

    [HttpPut("{id}")]
    [HasPermission("UserAccess.Edit")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateUserCommand command)
    {
        if (id != command.Id) return BadRequest("شناسه مغایرت دارد.");

        // نکته: command.ConcurrencyStamp باید از فرانت پر شده باشد
        await _mediator.Send(command);
        
        return NoContent();
    }

    [HttpDelete("{id}")]
    [HasPermission("UserAccess.Delete")]
    public async Task<IActionResult> Delete(string id)
    {
        // استفاده از کامند جدید و await کردن آن
        await _mediator.Send(new DeleteUserCommand(id));
        
        return NoContent();
    }
}