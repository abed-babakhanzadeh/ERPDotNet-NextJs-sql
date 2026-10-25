using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.BaseInfo.Commands.CreateFiscalYear;
using ERPDotNet.Application.Modules.BaseInfo.Contracts;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.UpdateFiscalYear;

public record UpdateFiscalYearCommand : IRequest<bool>
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public FiscalYearStatus Status { get; set; }
    public byte[]? RowVersion { get; set; }
}

public class UpdateFiscalYearValidator : AbstractValidator<UpdateFiscalYearCommand>
{
    public UpdateFiscalYearValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.Title).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Status).IsInEnum();
        RuleFor(x => x.EndDate).GreaterThan(x => x.StartDate).WithMessage("تاریخ پایان باید بعد از تاریخ شروع باشد.");
    }
}

public class UpdateFiscalYearHandler : IRequestHandler<UpdateFiscalYearCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IEnumerable<IBaseInfoUsageChecker> _usageCheckers;

    public UpdateFiscalYearHandler(IApplicationDbContext context, IEnumerable<IBaseInfoUsageChecker> usageCheckers)
    {
        _context = context;
        _usageCheckers = usageCheckers;
    }

    public async Task<bool> Handle(UpdateFiscalYearCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.FiscalYears.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("سال مالی یافت نشد.");

        if (request.RowVersion is { Length: > 0 })
            _context.Entry(entity).Property(x => x.RowVersion).OriginalValue = request.RowVersion;

        if (await _context.FiscalYears.AnyAsync(x => x.CompanyId == entity.CompanyId && x.Id != entity.Id && x.Title == request.Title, cancellationToken))
            throw new BusinessRuleException("عنوان سال مالی برای این شرکت تکراری است.");

        var datesChanged = entity.StartDate.Date != request.StartDate.Date || entity.EndDate.Date != request.EndDate.Date;
        if (datesChanged)
        {
            // سندهای ثبت‌شده با بازه قبلی به این سال نسبت داده شده‌اند؛ جابجایی بازه آن‌ها را بی‌سال می‌کند
            await BaseInfoUsage.EnsureUnusedAsync(_usageCheckers, BaseInfoReference.FiscalYear, entity.Id, cancellationToken);

            var overlap = await FiscalYearRules.FindOverlapAsync(_context, entity.CompanyId, request.StartDate, request.EndDate, entity.Id, cancellationToken);
            if (overlap != null)
                throw new BusinessRuleException($"بازه این سال مالی با سال مالی {overlap} هم‌پوشانی دارد.");
        }

        entity.Title = request.Title.Trim();
        entity.StartDate = request.StartDate.Date;
        entity.EndDate = request.EndDate.Date;
        entity.Status = request.Status;

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw ConflictException.Concurrency();
        }
        return true;
    }
}
