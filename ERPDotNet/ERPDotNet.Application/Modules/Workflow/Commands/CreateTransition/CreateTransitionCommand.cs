using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Workflow.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ERPDotNet.Domain.Modules.Workflow.Enums;

namespace ERPDotNet.Application.Modules.Workflow.Commands.CreateTransition;

public record CreateTransitionCommand(
    int ProcessVersionId,
    int FromStateId,
    int ToStateId,
    string ActionTitle,
    string? ActionCode,
    BpmsButtonVariant ButtonVariant,
    // نقش‌های مجاز به زدن این دکمه؛ خالی یعنی همه کاربران
    List<string>? RoleIds = null) : IRequest<int>;
public class CreateTransitionCommandValidator : AbstractValidator<CreateTransitionCommand>
{
    public CreateTransitionCommandValidator(IApplicationDbContext context)
    {
        RuleFor(v => v.ProcessVersionId).GreaterThan(0);
        RuleFor(v => v.FromStateId).GreaterThan(0);
        RuleFor(v => v.ToStateId).GreaterThan(0);
        RuleFor(v => v.ActionTitle).NotEmpty().MaximumLength(100);
        RuleFor(v => v.ButtonVariant).IsInEnum();
        RuleFor(v => v.RoleIds)
            .MustAsync((roleIds, ct) => TransitionRoleRules.AllExistAsync(context, roleIds, ct))
            .WithMessage(TransitionRoleRules.UnknownRoleMessage);
    }
}

public class CreateTransitionCommandHandler : IRequestHandler<CreateTransitionCommand, int>
{
    private readonly IApplicationDbContext _context;

    public CreateTransitionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CreateTransitionCommand request, CancellationToken cancellationToken)
    {
        // 🌟 گاردریل: جلوگیری از اتصال تکراری بین دو مرحله
        var isDuplicate = await _context.BpmsTransitions.AnyAsync(x => 
            x.ProcessVersionId == request.ProcessVersionId && 
            x.FromStateId == request.FromStateId && 
            x.ToStateId == request.ToStateId &&
            x.ActionTitle == request.ActionTitle, cancellationToken);

        if (isDuplicate) throw new BusinessRuleException("این دکمه/ارتباط قبلاً ایجاد شده است.");

        var transition = new BpmsTransition
        {
            ProcessVersionId = request.ProcessVersionId,
            FromStateId = request.FromStateId,
            ToStateId = request.ToStateId,
            ActionTitle = request.ActionTitle,
            ActionCode = string.IsNullOrWhiteSpace(request.ActionCode) ? null : request.ActionCode,
            ButtonVariant = request.ButtonVariant,            
            IsActive = true
        };

        foreach (var roleId in (request.RoleIds ?? []).Distinct())
        {
            transition.AllowedRoles.Add(new BpmsTransitionRole { RoleId = roleId });
        }

        _context.BpmsTransitions.Add(transition);
        await _context.SaveChangesAsync(cancellationToken);

        return transition.Id;
    }
}