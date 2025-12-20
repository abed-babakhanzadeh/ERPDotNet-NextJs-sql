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
        
        // 1. دریافت کاربران صفحه جاری
        var users = await query
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
                u.CreatedAt
            })
            .ToListAsync(cancellationToken);

        // 2. دریافت نقش‌های این کاربران (بهینه شده)
        var userIds = users.Select(u => u.Id).ToList();

        // جوین زدن جدول UserRoles با Roles برای گرفتن نام نقش
        var userRoles = await _context.UserRoles
            .AsNoTracking()
            .Where(ur => userIds.Contains(ur.UserId))
            .Join(_context.Roles, 
                  ur => ur.RoleId, 
                  r => r.Id, 
                  (ur, r) => new { ur.UserId, RoleName = r.Name })
            .ToListAsync(cancellationToken);

        // 3. مپ کردن نهایی
        var dtos = users.Select(u => new UserDto
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
            CreatedAt = u.CreatedAt,
            
            // پیدا کردن نقش‌های این کاربر از لیست حافظه
            Roles = userRoles
                    .Where(ur => ur.UserId == u.Id)
                    .Select(ur => ur.RoleName!)
                    .ToList()
        }).ToList();

        return new PaginatedResult<UserDto>(dtos, totalCount, request.PageNumber, request.PageSize);
    }
}