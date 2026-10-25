using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Workflow.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Workflow.Commands.Delegations;

// کاربر جاری اختیار کارتابلش را برای یک بازه به همکار می‌سپارد
public record CreateDelegationCommand : IRequest<int>
{
    public required string ToUserId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Reason { get; set; }
}

public class CreateDelegationValidator : AbstractValidator<CreateDelegationCommand>
{
    public CreateDelegationValidator()
    {
        RuleFor(v => v.ToUserId).NotEmpty().WithMessage("گیرنده تفویض را انتخاب کنید.");
        RuleFor(v => v.EndDate).GreaterThan(v => v.StartDate).WithMessage("پایان بازه باید بعد از شروع آن باشد.");
        RuleFor(v => v.Reason).MaximumLength(500);
    }
}

public class CreateDelegationHandler : IRequestHandler<CreateDelegationCommand, int>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CreateDelegationHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<int> Handle(CreateDelegationCommand request, CancellationToken cancellationToken)
    {
        var fromUserId = _currentUser.UserId ?? throw new ForbiddenAccessException("کاربر نامعتبر است.");
        int companyId = int.TryParse(_currentUser.CompanyId, out var cid) ? cid :
                        throw new ForbiddenAccessException("شناسه شرکت نامشخص است.");

        if (request.ToUserId == fromUserId)
            throw new BusinessRuleException("تفویض اختیار به خود معنا ندارد.");

        if (!await _context.Users.AnyAsync(u => u.Id == request.ToUserId && u.IsActive && !u.IsDeleted, cancellationToken))
            throw new BusinessRuleException("گیرنده تفویض یافت نشد یا غیرفعال است.");

        // زنجیره تفویض (الف به ب، ب به ج) عمداً پشتیبانی نمی‌شود؛ تفویض فقط نقش‌های خود کاربر را منتقل می‌کند
        var overlaps = await _context.BpmsDelegations.AnyAsync(d =>
            d.FromUserId == fromUserId && d.ToUserId == request.ToUserId && !d.IsRevoked &&
            d.StartDate < request.EndDate && request.StartDate < d.EndDate, cancellationToken);
        if (overlaps)
            throw new BusinessRuleException("برای همین همکار در این بازه تفویض فعال دیگری دارید.");

        var delegation = new BpmsDelegation
        {
            CompanyId = companyId,
            FromUserId = fromUserId,
            ToUserId = request.ToUserId,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Reason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim()
        };
        _context.BpmsDelegations.Add(delegation);
        await _context.SaveChangesAsync(cancellationToken);
        return delegation.Id;
    }
}
