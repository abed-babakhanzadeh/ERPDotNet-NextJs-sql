using ERPDotNet.Application.Modules.UserAccess.Commands.Login;
using ERPDotNet.Application.Modules.UserAccess.DTOs;
using ERPDotNet.Application.Modules.UserAccess.Queries.GetUserById; // برای پروفایل
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

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
}