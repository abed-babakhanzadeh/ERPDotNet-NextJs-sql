using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Workflow.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Workflow.Queries.GetTaskDetails;

public record GetTaskDetailsQuery(long TaskId) : IRequest<TaskDetailsDto>;

public class GetTaskDetailsQueryHandler : IRequestHandler<GetTaskDetailsQuery, TaskDetailsDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetTaskDetailsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<TaskDetailsDto> Handle(GetTaskDetailsQuery request, CancellationToken cancellationToken)
    {
        int companyId = int.TryParse(_currentUser.CompanyId, out var cid) ? cid : 
                        throw new UnauthorizedAccessException("شناسه شرکت نامشخص است.");

        var task = await _context.BpmsTasks
            .AsNoTracking()
            .Include(t => t.Instance)
                .ThenInclude(i => i.ProcessVersion)
                    .ThenInclude(pv => pv.Process)
            .Include(t => t.Instance.CurrentState)
            .FirstOrDefaultAsync(t => t.Id == request.TaskId && t.CompanyId == companyId, cancellationToken);

        if (task == null)
            throw new KeyNotFoundException("وظیفه مورد نظر یافت نشد.");

        // 🌟 واکشی دکمه‌ها همراه با رنگ (ButtonVariant)
        var availableTransitions = await _context.BpmsTransitions
            .AsNoTracking()
            .Where(tr => tr.FromStateId == task.Instance.CurrentStateId && tr.IsActive)
            .Select(tr => new TaskTransitionDto
            {
                TransitionId = tr.Id,
                ActionTitle = tr.ActionTitle,
                ButtonVariant = tr.ButtonVariant.ToString().ToLower() // 🌟 اختصاص رنگ دکمه
            })
            .ToListAsync(cancellationToken);

        return new TaskDetailsDto
        {
            TaskId = task.Id,
            InstanceId = task.InstanceId,
            ProcessCode = task.Instance.ProcessVersion.Process.ProcessCode,
            ProcessTitle = task.Instance.ProcessVersion.Process.Title,
            TaskTitle = task.Title,
            StateTitle = task.Instance.CurrentState.Title,
            TargetRecordId = task.Instance.TargetRecordId,
            CreatedAt = task.CreatedAt,
            AvailableTransitions = availableTransitions
        };
    }
}