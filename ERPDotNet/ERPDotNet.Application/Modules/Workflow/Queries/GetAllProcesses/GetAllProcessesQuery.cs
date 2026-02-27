using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.Workflow.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Workflow.Queries.GetAllProcesses;

public record GetAllProcessesQuery : PaginatedRequest, IRequest<PaginatedResult<ProcessDto>>;

public class GetAllProcessesQueryHandler : IRequestHandler<GetAllProcessesQuery, PaginatedResult<ProcessDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetAllProcessesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<PaginatedResult<ProcessDto>> Handle(GetAllProcessesQuery request, CancellationToken cancellationToken)
    {
        int companyId = int.TryParse(_currentUserService.CompanyId, out var cid) ? cid : 1;

        var query = _context.BpmsProcesses
            .Include(x => x.Versions)
            .Where(x => x.CompanyId == companyId)
            .AsNoTracking();

        // جستجو (Search)
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            query = query.Where(x => x.Title.Contains(request.SearchTerm) || x.ProcessCode.Contains(request.SearchTerm));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.Id)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(x => new ProcessDto
            {
                Id = x.Id,
                ProcessCode = x.ProcessCode,
                Title = x.Title,
                TargetEntityName = x.TargetEntityName,
                IsActive = x.IsActive,
                // پیدا کردن نسخه فعال
                ActiveVersionId = x.Versions.Where(v => v.IsActive).Select(v => v.Id).FirstOrDefault(),
                ActiveVersionNumber = x.Versions.Where(v => v.IsActive).Select(v => v.VersionNumber).FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        return new PaginatedResult<ProcessDto>(items, totalCount, request.PageNumber, request.PageSize);
    }
}