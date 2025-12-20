using ERPDotNet.Application.Modules.UserAccess.Commands.Login;
using ERPDotNet.Application.Modules.UserAccess.DTOs;
using ERPDotNet.Application.Modules.UserAccess.Queries.GetUserById; // برای پروفایل
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ERPDotNet.Application.Modules.UserAccess.Commands.ChangeOwnPassword;

namespace ERPDotNet.API.Controllers.UserAccess;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("login")]
    public async Task<ActionResult<string>> Login([FromBody] LoginCommand command)
    {
        // تمام لاجیک (چک پسورد، تولید توکن) در هندلر است
        var token = await _mediator.Send(command);
        return Ok(new { token });
    }

    [HttpGet("profile")]
    [Authorize]
    public async Task<ActionResult<UserDto>> GetProfile()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        // استفاده از کوئری موجود برای گرفتن اطلاعات کامل کاربر
        var userDto = await _mediator.Send(new GetUserByIdQuery(userId));
        
        if (userDto == null) return NotFound();

        return Ok(userDto);
    }

    [HttpPost("change-password")]
    [Authorize] // حتماً لاگین باشد
    public async Task<IActionResult> ChangeOwnPassword([FromBody] ChangeOwnPasswordDto body)
    {
        // گرفتن ID کاربر از توکن (Claim)
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        await _mediator.Send(new ChangeOwnPasswordCommand 
        { 
            UserId = userId,
            CurrentPassword = body.CurrentPassword,
            NewPassword = body.NewPassword 
        });

        return NoContent();
    }
}

// DTO ورودی
    public record ChangeOwnPasswordDto(string CurrentPassword, string NewPassword);