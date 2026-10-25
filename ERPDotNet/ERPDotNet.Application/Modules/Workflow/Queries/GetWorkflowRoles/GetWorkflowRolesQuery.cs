using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Workflow.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Workflow.Queries.GetWorkflowRoles;

// فهرست نقش‌ها برای انتخاب در طراح گردش کار (بدون نیاز به دسترسی مدیریت نقش‌ها)
public record GetWorkflowRolesQuery : IRequest<List<TransitionRoleDto>>;

public class GetWorkflowRolesQueryHandler : IRequestHandler<GetWorkflowRolesQuery, List<TransitionRoleDto>>
{
    private readonly IApplicationDbContext _context;

    public GetWorkflowRolesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<TransitionRoleDto>> Handle(GetWorkflowRolesQuery request, CancellationToken cancellationToken)
    {
        return await _context.Roles
            .AsNoTracking()
            .OrderBy(r => r.Name)
            .Select(r => new TransitionRoleDto { Id = r.Id, Name = r.Name ?? r.Id })
            .ToListAsync(cancellationToken);
    }
}
