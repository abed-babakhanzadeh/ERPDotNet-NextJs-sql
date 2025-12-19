using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.UserAccess.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.UserAccess.Queries.GetAllUsers;

[Cached(timeToLiveSeconds: 60, "Users")]
public record GetAllUsersQuery : PaginatedRequest, IRequest<PaginatedResult<UserDto>>;

public class GetAllUsersHandler : IRequestHandler<GetAllUsersQuery, PaginatedResult<UserDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAllUsersHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<UserDto>> Handle(GetAllUsersQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Users
            .AsNoTracking()
            .Where(u => !u.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim().ToLower();
            query = query.Where(u => 
                u.UserName!.ToLower().Contains(term) ||
                u.FirstName.ToLower().Contains(term) ||
                u.LastName.ToLower().Contains(term));
        }
        
        query = query.ApplyDynamicFilters(request.Filters);

        var totalCount = await query.CountAsync(cancellationToken);
        
        var items = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(u => new 
            {
                u.Id,
                u.UserName,
                u.Email,
                u.FirstName,
                u.LastName,
                u.IsActive,
                u.PersonnelCode,
                u.NationalCode,
                u.ConcurrencyStamp,
                u.CreatedAt // اینجا DateTime است
            })
            .ToListAsync(cancellationToken);

        // مپینگ نهایی
        var dtos = items.Select(u => new UserDto
        {
            Id = u.Id,
            Username = u.UserName!,
            Email = u.Email!,
            FirstName = u.FirstName,
            LastName = u.LastName,
            IsActive = u.IsActive,
            PersonnelCode = u.PersonnelCode,
            NationalCode = u.NationalCode,
            ConcurrencyStamp = u.ConcurrencyStamp,
            
            // === انتقال مستقیم مقدار DateTime ===
            CreatedAt = u.CreatedAt 
        }).ToList();

        return new PaginatedResult<UserDto>(dtos, totalCount, request.PageNumber, request.PageSize);
    }
}