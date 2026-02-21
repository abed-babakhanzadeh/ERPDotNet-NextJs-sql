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

        // 1. واکشی تسک همراه با اطلاعات ضروری پرونده
        var task = await _context.BpmsTasks
            .AsNoTracking()
            .Include(t => t.Instance)
                .ThenInclude(i => i.ProcessVersion)
                    .ThenInclude(pv => pv.Process)
            .Include(t => t.Instance.CurrentState)
            .FirstOrDefaultAsync(t => t.Id == request.TaskId && t.CompanyId == companyId, cancellationToken);

        if (task == null)
            throw new KeyNotFoundException("وظیفه مورد نظر یافت نشد یا دسترسی ندارید.");

        // 2. واکشی دکمه‌های مجاز (Transition ها) بر اساس وضعیت فعلیِ پرونده
        // در یک سیستم فوق‌پیشرفته، اینجا Role کاربر هم چک می‌شود که آیا اجازه دیدن این دکمه را دارد یا خیر
        // 2. واکشی دکمه‌های مجاز (فقط فعال‌ها)
        var availableTransitions = await _context.BpmsTransitions
            .AsNoTracking()
            .Where(tr => tr.FromStateId == task.Instance.CurrentStateId && tr.IsActive) // 🌟 اضافه شدن IsActive
            // 💡 برای آینده: در اینجا می‌توانیم دسترسی نقش‌ها را هم چک کنیم
            // && tr.AllowedRoles.Any(r => userRoles.Contains(r.RoleId))
            .Select(tr => new TaskTransitionDto
            {
                TransitionId = tr.Id,
                ActionTitle = tr.ActionTitle
            })
            .ToListAsync(cancellationToken);

        // 3. نگاشت به DTO خروجی
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