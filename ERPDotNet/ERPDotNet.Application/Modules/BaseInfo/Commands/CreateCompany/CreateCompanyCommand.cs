using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.CreateCompany;

public record CreateCompanyCommand : IRequest<int>
{
    public required string Code { get; set; }
    public required string Title { get; set; }
    public string? NationalId { get; set; }
    public string? EconomicCode { get; set; }
    public string? RegistrationNumber { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
}

public class CreateCompanyValidator : AbstractValidator<CreateCompanyCommand>
{
    public CreateCompanyValidator(IApplicationDbContext context)
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.NationalId).Matches("^[0-9]{11}$").When(x => !string.IsNullOrEmpty(x.NationalId))
            .WithMessage("شناسه ملی باید ۱۱ رقم باشد.");
        RuleFor(x => x.EconomicCode).Matches("^[0-9]{12,14}$").When(x => !string.IsNullOrEmpty(x.EconomicCode))
            .WithMessage("کد اقتصادی باید ۱۲ تا ۱۴ رقم باشد.");
        RuleFor(x => x.Code)
            .MustAsync(async (code, ct) => !await context.Companies.AnyAsync(c => c.Code == code, ct))
            .WithMessage("کد شرکت تکراری است.");
    }
}

public class CreateCompanyHandler : IRequestHandler<CreateCompanyCommand, int>
{
    private readonly IApplicationDbContext _context;

    public CreateCompanyHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CreateCompanyCommand request, CancellationToken cancellationToken)
    {
        var entity = new Company
        {
            Code = request.Code.Trim(),
            Title = request.Title.Trim(),
            NationalId = request.NationalId,
            EconomicCode = request.EconomicCode,
            RegistrationNumber = request.RegistrationNumber,
            Phone = request.Phone,
            Address = request.Address,
            IsActive = true
        };

        _context.Companies.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }
}
