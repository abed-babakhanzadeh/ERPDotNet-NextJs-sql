using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Workflow.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Workflow.Queries.GetProcessDetails;

public record GetProcessDetailsQuery(int ProcessId) : IRequest<ProcessDetailsDto>;

public class GetProcessDetailsQueryHandler : IRequestHandler<GetProcessDetailsQuery, ProcessDetailsDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetProcessDetailsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<ProcessDetailsDto> Handle(GetProcessDetailsQuery request, CancellationToken cancellationToken)
    {
        int companyId = int.TryParse(_currentUserService.CompanyId, out var cid) ? cid : 1;

        var process = await _context.BpmsProcesses
            .Include(x => x.Versions)
                .ThenInclude(v => v.States)
            .Include(x => x.Versions)
                .ThenInclude(v => v.Transitions)
                    .ThenInclude(t => t.FromState)
            .Include(x => x.Versions)
                .ThenInclude(v => v.Transitions)
                    .ThenInclude(t => t.ToState)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.ProcessId && x.CompanyId == companyId, cancellationToken);

        if (process == null) throw new KeyNotFoundException("فرآیند یافت نشد.");

        var activeVersion = process.Versions.FirstOrDefault(x => x.IsActive) ?? process.Versions.OrderByDescending(x => x.VersionNumber).FirstOrDefault();
        
        var dto = new ProcessDetailsDto
        {
            Id = process.Id,
            ProcessCode = process.ProcessCode,
            Title = process.Title,
            TargetEntityName = process.TargetEntityName,
            IsActive = process.IsActive,
            ActiveVersionId = activeVersion?.Id ?? 0,
            ActiveVersionNumber = activeVersion?.VersionNumber ?? 0
        };

        if (activeVersion != null)
        {
            dto.States = activeVersion.States.Select(s => new StateDto
            {
                Id = s.Id,
                Title = s.Title,
                StateCode = s.StateCode,
                Type = (int)s.Type
            }).ToList();

            dto.Transitions = activeVersion.Transitions.Select(t => new TransitionDto
            {
                Id = t.Id,
                FromStateId = t.FromStateId,
                FromStateTitle = t.FromState.Title,
                ToStateId = t.ToStateId,
                ToStateTitle = t.ToState.Title,
                ActionTitle = t.ActionTitle,
                ActionCode = t.ActionCode,
                ButtonVariant = t.ButtonVariant.ToString().ToLower(), // 🌟 اختصاص رنگ دکمه
                IsActive = t.IsActive
            }).ToList();
        }

        return dto;
    }
}