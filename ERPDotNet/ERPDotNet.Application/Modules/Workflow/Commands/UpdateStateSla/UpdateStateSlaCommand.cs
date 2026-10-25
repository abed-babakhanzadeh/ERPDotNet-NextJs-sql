using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Workflow.Commands.UpdateStateSla;

// مهلت انجام و نقش ارجاع یک مرحله؛ فقط روی کارهایی که از این پس ساخته می‌شوند اثر دارد
public record UpdateStateSlaCommand : IRequest
{
    public int Id { get; set; }
    public int? SlaHours { get; set; }
    public string? EscalationRoleId { get; set; }
}

public class UpdateStateSlaValidator : AbstractValidator<UpdateStateSlaCommand>
{
    public UpdateStateSlaValidator()
    {
        RuleFor(v => v.SlaHours).InclusiveBetween(1, 8760).When(v => v.SlaHours.HasValue)
            .WithMessage("مهلت انجام باید بین ۱ ساعت و یک سال باشد.");
        RuleFor(v => v.EscalationRoleId).Null().When(v => !v.SlaHours.HasValue)
            .WithMessage("ارجاع پس از سررسید بدون تعیین مهلت انجام معنا ندارد.");
    }
}

public class UpdateStateSlaHandler : IRequestHandler<UpdateStateSlaCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateStateSlaHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(UpdateStateSlaCommand request, CancellationToken cancellationToken)
    {
        var state = await _context.BpmsStates.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("مرحله یافت نشد.");

        if (request.EscalationRoleId != null && !await _context.Roles.AnyAsync(r => r.Id == request.EscalationRoleId, cancellationToken))
            throw new BusinessRuleException("نقش ارجاع یافت نشد.");

        state.SlaHours = request.SlaHours;
        state.EscalationRoleId = request.EscalationRoleId;
        await _context.SaveChangesAsync(cancellationToken);
    }
}
