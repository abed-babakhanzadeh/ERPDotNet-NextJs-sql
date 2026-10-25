using ERPDotNet.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Workflow.Queries.GetDelegations;

public record DelegationDto(
    int Id,
    string FromUserId,
    string FromUserName,
    string ToUserId,
    string ToUserName,
    DateTime StartDate,
    DateTime EndDate,
    string? Reason,
    bool IsRevoked,
    bool IsActive,
    bool IsMine);

public record DelegateUserDto(string Id, string FullName, string UserName);

/// <summary>تفویض‌هایی که کاربر جاری داده یا گرفته است</summary>
public record GetDelegationsQuery : IRequest<List<DelegationDto>>;

/// <summary>همکاران فعال برای انتخاب گیرنده تفویض</summary>
public record GetDelegateUsersQuery : IRequest<List<DelegateUserDto>>;

public class GetDelegationsHandler :
    IRequestHandler<GetDelegationsQuery, List<DelegationDto>>,
    IRequestHandler<GetDelegateUsersQuery, List<DelegateUserDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetDelegationsHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<List<DelegationDto>> Handle(GetDelegationsQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId;
        var now = DateTime.UtcNow;

        var rows = await (
            from d in _context.BpmsDelegations.AsNoTracking()
            where d.FromUserId == userId || d.ToUserId == userId
            join f in _context.Users on d.FromUserId equals f.Id
            join t in _context.Users on d.ToUserId equals t.Id
            orderby d.StartDate descending
            select new { d, FromName = f.FirstName + " " + f.LastName, ToName = t.FirstName + " " + t.LastName }
        ).ToListAsync(cancellationToken);

        return rows.Select(r => new DelegationDto(
            r.d.Id, r.d.FromUserId, r.FromName.Trim(), r.d.ToUserId, r.ToName.Trim(),
            r.d.StartDate, r.d.EndDate, r.d.Reason, r.d.IsRevoked,
            !r.d.IsRevoked && r.d.StartDate <= now && r.d.EndDate >= now,
            r.d.FromUserId == userId)).ToList();
    }

    public async Task<List<DelegateUserDto>> Handle(GetDelegateUsersQuery request, CancellationToken cancellationToken)
    {
        return await _context.Users
            .AsNoTracking()
            .Where(u => u.IsActive && !u.IsDeleted && u.Id != _currentUser.UserId)
            .OrderBy(u => u.LastName).ThenBy(u => u.FirstName)
            .Select(u => new DelegateUserDto(u.Id, (u.FirstName + " " + u.LastName).Trim(), u.UserName ?? u.Id))
            .ToListAsync(cancellationToken);
    }
}
