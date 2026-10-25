using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.CreateFiscalYear;

public record CreateFiscalYearCommand : IRequest<int>
{
    public int CompanyId { get; set; }
    public required string Title { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}

public class CreateFiscalYearValidator : AbstractValidator<CreateFiscalYearCommand>
{
    public CreateFiscalYearValidator(IApplicationDbContext context)
    {
        RuleFor(x => x.CompanyId)
            .MustAsync((id, ct) => context.Companies.AnyAsync(c => c.Id == id, ct))
            .WithMessage("شرکت انتخاب‌شده یافت نشد.");
        RuleFor(x => x.Title).NotEmpty().MaximumLength(50)
            .MustAsync(async (cmd, title, ct) =>
                !await context.FiscalYears.AnyAsync(x => x.CompanyId == cmd.CompanyId && x.Title == title, ct))
            .WithMessage("عنوان سال مالی برای این شرکت تکراری است.");
        RuleFor(x => x.StartDate).NotEmpty();
        RuleFor(x => x.EndDate).NotEmpty()
            .GreaterThan(x => x.StartDate).WithMessage("تاریخ پایان باید بعد از تاریخ شروع باشد.");
        RuleFor(x => x).CustomAsync(async (cmd, validation, ct) =>
        {
            if (cmd.EndDate <= cmd.StartDate) return;
            var overlap = await FiscalYearRules.FindOverlapAsync(context, cmd.CompanyId, cmd.StartDate, cmd.EndDate, null, ct);
            if (overlap != null)
                validation.AddFailure(nameof(cmd.StartDate), $"بازه این سال مالی با سال مالی {overlap} هم‌پوشانی دارد.");
        });
    }
}

public class CreateFiscalYearHandler : IRequestHandler<CreateFiscalYearCommand, int>
{
    private readonly IApplicationDbContext _context;

    public CreateFiscalYearHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CreateFiscalYearCommand request, CancellationToken cancellationToken)
    {
        var entity = new FiscalYear
        {
            CompanyId = request.CompanyId,
            Title = request.Title.Trim(),
            StartDate = request.StartDate.Date,
            EndDate = request.EndDate.Date,
            Status = FiscalYearStatus.Open
        };

        _context.FiscalYears.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }
}
