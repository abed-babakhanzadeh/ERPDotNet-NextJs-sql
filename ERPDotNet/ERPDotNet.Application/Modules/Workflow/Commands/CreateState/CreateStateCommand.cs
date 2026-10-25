using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Workflow.Entities;
using ERPDotNet.Domain.Modules.Workflow.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Workflow.Commands.CreateState;

public record CreateStateCommand(
    int ProcessVersionId,
    string Title,
    string StateCode,
    BpmsStateType Type,
    int? SlaHours = null,
    string? EscalationRoleId = null) : IRequest<int>;

public class CreateStateCommandValidator : AbstractValidator<CreateStateCommand>
{
    public CreateStateCommandValidator()
    {
        RuleFor(v => v.ProcessVersionId).GreaterThan(0);
        RuleFor(v => v.Title).NotEmpty().MaximumLength(100);
        RuleFor(v => v.StateCode).NotEmpty().MaximumLength(50);
        RuleFor(v => v.Type).IsInEnum();
        RuleFor(v => v.SlaHours).InclusiveBetween(1, 8760).When(v => v.SlaHours.HasValue)
            .WithMessage("مهلت انجام باید بین ۱ ساعت و یک سال باشد.");
        RuleFor(v => v.EscalationRoleId).Null().When(v => !v.SlaHours.HasValue)
            .WithMessage("ارجاع پس از سررسید بدون تعیین مهلت انجام معنا ندارد.");
    }
}

public class CreateStateCommandHandler : IRequestHandler<CreateStateCommand, int>
{
    private readonly IApplicationDbContext _context;

    public CreateStateCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CreateStateCommand request, CancellationToken cancellationToken)
    {
        var versionExists = await _context.BpmsProcessVersions.AnyAsync(x => x.Id == request.ProcessVersionId, cancellationToken);
        if (!versionExists) throw new KeyNotFoundException("نسخه فرآیند یافت نشد.");

        // بررسی تکراری نبودن کد مرحله در این نسخه
        if (await _context.BpmsStates.AnyAsync(x => x.ProcessVersionId == request.ProcessVersionId && x.StateCode == request.StateCode, cancellationToken))
            throw new BusinessRuleException("کد مرحله (StateCode) در این فرآیند تکراری است.");

        if (request.EscalationRoleId != null && !await _context.Roles.AnyAsync(r => r.Id == request.EscalationRoleId, cancellationToken))
            throw new BusinessRuleException("نقش ارجاع یافت نشد.");

        var state = new BpmsState
        {
            ProcessVersionId = request.ProcessVersionId,
            Title = request.Title,
            StateCode = request.StateCode,
            Type = request.Type,
            SlaHours = request.SlaHours,
            EscalationRoleId = request.EscalationRoleId
        };

        _context.BpmsStates.Add(state);
        await _context.SaveChangesAsync(cancellationToken);

        return state.Id;
    }
}