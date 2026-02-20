using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Workflow.Contracts;
using ERPDotNet.Application.Modules.Workflow.Interfaces;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Workflow.Commands.CompleteTask;

public record CompleteTaskCommand(
    long TaskId, 
    int TransitionId, // آی‌دی یال (مسیری) که کاربر انتخاب کرده (مثلاً دکمه "تایید" یا "رد")
    string? Comment,
    Dictionary<string, object?>? Variables
) : IRequest<bool>;

public class CompleteTaskValidator : AbstractValidator<CompleteTaskCommand>
{
    public CompleteTaskValidator()
    {
        RuleFor(x => x.TaskId).GreaterThan(0);
        RuleFor(x => x.TransitionId).GreaterThan(0);
    }
}

public class CompleteTaskHandler : IRequestHandler<CompleteTaskCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IBpmsEngineService _engine;
    private readonly ICurrentUserService _currentUser;

    public CompleteTaskHandler(
        IApplicationDbContext context,
        IBpmsEngineService engine,
        ICurrentUserService currentUser)
    {
        _context = context;
        _engine = engine;
        _currentUser = currentUser;
    }

    public async Task<bool> Handle(CompleteTaskCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_currentUser.UserId))
            throw new UnauthorizedAccessException("کاربر نامعتبر است.");

        int userCompanyId = int.TryParse(_currentUser.CompanyId, out var cid) ? cid : 
                            throw new UnauthorizedAccessException("شناسه شرکت کاربر نامشخص است.");

        // 1. پیدا کردن تسک در کارتابل کاربر
        var task = await _context.BpmsTasks
            .FirstOrDefaultAsync(x => x.Id == request.TaskId && x.CompanyId == userCompanyId, cancellationToken);

        if (task == null)
            throw new KeyNotFoundException("وظیفه مورد نظر یافت نشد یا شما دسترسی به آن ندارید.");

        if (task.IsCompleted)
            throw new BusinessRuleException("این وظیفه قبلاً انجام شده است.");

        // 2. واگذاری اجرای انتقال (Transition) به موتور BPMS
        // موتور خودش تراکنش را باز می‌کند، اعتبارسنجی می‌کند، اکشن انبار را اجرا می‌کند و در نهایت ذخیره می‌کند
        await _engine.ExecuteTransitionAsync(new ExecuteTransitionRequest
        {
            InstanceId = task.InstanceId,
            TransitionId = request.TransitionId,
            UserId = _currentUser.UserId,
            Comment = request.Comment,
            ExtraVariables = request.Variables
        }, cancellationToken);

        return true;
    }
}