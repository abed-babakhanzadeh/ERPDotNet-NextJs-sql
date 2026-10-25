using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.UpdateCompany;

public record UpdateCompanyCommand : IRequest<bool>
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public required string Title { get; set; }
    public string? NationalId { get; set; }
    public string? EconomicCode { get; set; }
    public string? RegistrationNumber { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public bool IsActive { get; set; }
    public byte[]? RowVersion { get; set; }
}

public class UpdateCompanyValidator : AbstractValidator<UpdateCompanyCommand>
{
    public UpdateCompanyValidator(IApplicationDbContext context)
    {
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.NationalId).Matches("^[0-9]{11}$").When(x => !string.IsNullOrEmpty(x.NationalId))
            .WithMessage("شناسه ملی باید ۱۱ رقم باشد.");
        RuleFor(x => x.EconomicCode).Matches("^[0-9]{12,14}$").When(x => !string.IsNullOrEmpty(x.EconomicCode))
            .WithMessage("کد اقتصادی باید ۱۲ تا ۱۴ رقم باشد.");
        RuleFor(x => x.Code)
            .MustAsync(async (cmd, code, ct) => !await context.Companies.AnyAsync(c => c.Code == code && c.Id != cmd.Id, ct))
            .WithMessage("کد شرکت تکراری است.");
    }
}

public class UpdateCompanyHandler : IRequestHandler<UpdateCompanyCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateCompanyHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateCompanyCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Companies.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("شرکت یافت نشد.");

        if (request.RowVersion is { Length: > 0 })
            _context.Entry(entity).Property(x => x.RowVersion).OriginalValue = request.RowVersion;

        entity.Code = request.Code.Trim();
        entity.Title = request.Title.Trim();
        entity.NationalId = request.NationalId;
        entity.EconomicCode = request.EconomicCode;
        entity.RegistrationNumber = request.RegistrationNumber;
        entity.Phone = request.Phone;
        entity.Address = request.Address;
        entity.IsActive = request.IsActive;

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
