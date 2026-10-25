using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Workflow.DTOs;
using ERPDotNet.Application.Modules.Workflow.Services;
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
                        throw new ForbiddenAccessException("شناسه شرکت نامشخص است.");

        var task = await _context.BpmsTasks
            .AsNoTracking()
            .Include(t => t.Instance)
                .ThenInclude(i => i.ProcessVersion)
                    .ThenInclude(pv => pv.Process)
            .Include(t => t.Instance.CurrentState)
            .Include(t => t.State)
            .FirstOrDefaultAsync(t => t.Id == request.TaskId && t.CompanyId == companyId, cancellationToken);

        if (task == null)
            throw new KeyNotFoundException("وظیفه مورد نظر یافت نشد.");

        // 🌟 واکشی دکمه‌ها همراه با رنگ (ButtonVariant) — فقط دکمه‌هایی که کاربر اجازه اجرایشان را دارد
        var userRoles = await BpmsTransitionAccess.GetUserRolesAsync(_context, _currentUser.UserId, cancellationToken);
        // پس از سررسید، دارنده نقش ارجاع همه دکمه‌های مرحله را می‌بیند
        bool overdue = !task.IsCompleted && task.DueDate < DateTime.UtcNow;
        bool viaEscalation = overdue && BpmsTransitionAccess.HoldsEscalationRole(userRoles, task.State);
        var transitions = _context.BpmsTransitions
            .AsNoTracking()
            .Where(tr => tr.FromStateId == task.Instance.CurrentStateId && tr.IsActive);
        if (!viaEscalation) transitions = transitions.Where(BpmsTransitionAccess.CanExecute(userRoles));

        var availableTransitions = await transitions
            .Select(tr => new TaskTransitionDto
            {
                TransitionId = tr.Id,
                ActionTitle = tr.ActionTitle,
                ButtonVariant = tr.ButtonVariant.ToString().ToLower() // 🌟 اختصاص رنگ دکمه
            })
            .ToListAsync(cancellationToken);

        var history = await (
            from h in _context.BpmsHistories.AsNoTracking()
            where h.InstanceId == task.InstanceId
            join u in _context.Users on h.PerformedByUserId equals u.Id into performers
            from u in performers.DefaultIfEmpty()
            join o in _context.Users on h.OnBehalfOfUserId equals o.Id into delegators
            from o in delegators.DefaultIfEmpty()
            orderby h.CreatedAt, h.Id
            select new TaskHistoryDto
            {
                ActionTitle = h.ActionTitle,
                PerformedBy = u != null ? (u.FirstName + " " + u.LastName).Trim() : h.PerformedByUserId,
                OnBehalfOf = o != null ? (o.FirstName + " " + o.LastName).Trim() : null,
                Comment = h.Comment,
                CreatedAt = h.CreatedAt
            }).ToListAsync(cancellationToken);

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
            DueDate = task.DueDate,
            IsOverdue = overdue,
            ViaEscalation = viaEscalation,
            AvailableTransitions = availableTransitions,
            History = history
        };
    }
}