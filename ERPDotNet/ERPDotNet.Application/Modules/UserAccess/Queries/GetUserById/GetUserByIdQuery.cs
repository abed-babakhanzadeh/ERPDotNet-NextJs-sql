using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.UserAccess.DTOs;
using ERPDotNet.Application.Modules.UserAccess.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.UserAccess.Queries.GetUserById;

public record GetUserByIdQuery(string Id) : IRequest<UserDto?>;

public class GetUserByIdHandler : IRequestHandler<GetUserByIdQuery, UserDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly IIdentityService _identityService;

    public GetUserByIdHandler(IApplicationDbContext context, IIdentityService identityService)
    {
        _context = context;
        _identityService = identityService;
    }

    public async Task<UserDto?> Handle(GetUserByIdQuery request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == request.Id, cancellationToken);

        if (user == null) return null;

        var roles = await _identityService.GetUserRolesAsync(user.Id);

        return new UserDto
        {
            Id = user.Id,
            Username = user.UserName!,
            Email = user.Email!,
            FirstName = user.FirstName,
            LastName = user.LastName,
            IsActive = user.IsActive,
            PersonnelCode = user.PersonnelCode,
            NationalCode = user.NationalCode,
            ConcurrencyStamp = user.ConcurrencyStamp,
            
            // === انتقال مستقیم مقدار DateTime ===
            CreatedAt = user.CreatedAt,
            
            Roles = roles.ToList()
        };
    }
}