using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Workflow.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Workflow.Commands.UpdateTransitionRoles;

// جایگزینی کامل نقش‌های مجاز یک دکمه؛ لیست خالی یعنی دکمه برای همه کاربران آزاد است
public record UpdateTransitionRolesCommand(int TransitionId, List<string> RoleIds) : IRequest<bool>;

public class UpdateTransitionRolesCommandValidator : AbstractValidator<UpdateTransitionRolesCommand>
{
    public UpdateTransitionRolesCommandValidator(IApplicationDbContext context)
    {
        RuleFor(v => v.TransitionId).GreaterThan(0);
        RuleFor(v => v.RoleIds).NotNull();
        RuleFor(v => v.RoleIds)
            .MustAsync((roleIds, ct) => TransitionRoleRules.AllExistAsync(context, roleIds, ct))
            .WithMessage(TransitionRoleRules.UnknownRoleMessage);
    }
}

public class UpdateTransitionRolesCommandHandler : IRequestHandler<UpdateTransitionRolesCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateTransitionRolesCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateTransitionRolesCommand request, CancellationToken cancellationToken)
    {
        var transition = await _context.BpmsTransitions
            .Include(t => t.AllowedRoles)
            .FirstOrDefaultAsync(t => t.Id == request.TransitionId, cancellationToken)
            ?? throw new KeyNotFoundException("دکمه (ارتباط) مورد نظر یافت نشد.");

        var requested = request.RoleIds.Distinct().ToHashSet();

        foreach (var removed in transition.AllowedRoles.Where(r => !requested.Contains(r.RoleId)).ToList())
        {
            _context.BpmsTransitionRoles.Remove(removed);
        }

        var existing = transition.AllowedRoles.Select(r => r.RoleId).ToHashSet();
        foreach (var roleId in requested.Where(id => !existing.Contains(id)))
        {
            transition.AllowedRoles.Add(new BpmsTransitionRole { TransitionId = transition.Id, RoleId = roleId });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
