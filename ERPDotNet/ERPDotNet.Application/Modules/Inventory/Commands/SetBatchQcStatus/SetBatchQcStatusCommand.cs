using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.SetBatchQcStatus;

/// <summary>نتیجه کنترل کیفیت بچ؛ چه کسی و کی آن را ثبت کرد کنار بچ می‌ماند</summary>
[CacheInvalidation("InventoryBatches")]
public record SetBatchQcStatusCommand : IRequest
{
    public int Id { get; set; }
    public BatchQcStatus QcStatus { get; set; }
    public string? Note { get; set; }
}

public class SetBatchQcStatusValidator : AbstractValidator<SetBatchQcStatusCommand>
{
    public SetBatchQcStatusValidator()
    {
        RuleFor(x => x.QcStatus).IsInEnum();
        RuleFor(x => x.Note).MaximumLength(500);
        RuleFor(x => x.Note).NotEmpty().When(x => x.QcStatus == BatchQcStatus.Rejected)
            .WithMessage("دلیل مردود شدن بچ را بنویسید.");
    }
}

public class SetBatchQcStatusHandler : IRequestHandler<SetBatchQcStatusCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public SetBatchQcStatusHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task Handle(SetBatchQcStatusCommand request, CancellationToken cancellationToken)
    {
        var batch = await _context.InventoryBatches.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("بچ یافت نشد.");

        batch.QcStatus = request.QcStatus;
        batch.QcNote = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        batch.QcCheckedAt = DateTime.UtcNow;
        batch.QcCheckedBy = _currentUser.UserId;
        await _context.SaveChangesAsync(cancellationToken);
    }
}
