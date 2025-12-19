using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.UserAccess.Interfaces;
using ERPDotNet.Domain.Modules.UserAccess.Entities; // اضافه شد
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.UserAccess.Commands.Login;

public record LoginCommand : IRequest<string>
{
    public required string Username { get; set; }
    public required string Password { get; set; }
}

public class LoginHandler : IRequestHandler<LoginCommand, string>
{
    private readonly IIdentityService _identityService;
    private readonly ITokenService _tokenService;
    private readonly IApplicationDbContext _context;

    public LoginHandler(IIdentityService identityService, ITokenService tokenService, IApplicationDbContext context)
    {
        _identityService = identityService;
        _tokenService = tokenService;
        _context = context;
    }

    public async Task<string> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var isValid = await _identityService.CheckPasswordAsync(request.Username, request.Password);
        if (!isValid)
            throw new ValidationException("نام کاربری یا رمز عبور اشتباه است.");

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserName == request.Username, cancellationToken);

        if (user == null) throw new UnauthorizedAccessException();

        var roles = await _identityService.GetUserRolesAsync(user.Id);
        return _tokenService.GenerateToken(user, roles);
    }
}