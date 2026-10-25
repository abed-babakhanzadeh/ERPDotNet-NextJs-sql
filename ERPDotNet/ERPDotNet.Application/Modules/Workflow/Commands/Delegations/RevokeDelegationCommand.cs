using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Workflow.Commands.Delegations;

// فقط تفویض‌کننده می‌تواند تفویض خودش را لغو کند
public record RevokeDelegationCommand(int Id) : IRequest;

public class RevokeDelegationHandler : IRequestHandler<RevokeDelegationCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public RevokeDelegationHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task Handle(RevokeDelegationCommand request, CancellationToken cancellationToken)
    {
        var delegation = await _context.BpmsDelegations
            .FirstOrDefaultAsync(d => d.Id == request.Id && d.FromUserId == _currentUser.UserId, cancellationToken)
            ?? throw new KeyNotFoundException("تفویض یافت نشد.");

        if (delegation.IsRevoked)
            throw new BusinessRuleException("این تفویض قبلاً لغو شده است.");

        delegation.IsRevoked = true;
        await _context.SaveChangesAsync(cancellationToken);
    }
}
