// راه حل تداخل نام: استفاده از Alias
using DomainUnit = ERPDotNet.Domain.Modules.BaseInfo.Entities.Unit; 
using ERPDotNet.Application.Common.Interfaces; // استفاده از اینترفیس
using FluentValidation;
using MediatR;
using ERPDotNet.Application.Common.Attributes;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.CreateUnit;

[CacheInvalidation("Units", "UnitsLookup")]
public record CreateUnitCommand : IRequest<int>
{
    public required string Title { get; set; }
    public required string Symbol { get; set; }
    public int Precision { get; set; }
    
    // فیلدهای جدید برای واحد فرعی (اختیاری)
    public int? BaseUnitId { get; set; }
    public decimal ConversionFactor { get; set; } = 1;
}

public class CreateUnitValidator : AbstractValidator<CreateUnitCommand>
{
    private readonly IApplicationDbContext _context;

    // تزریق دیتابیس به Validator
    public CreateUnitValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("عنوان واحد الزامی است.")
            .MaximumLength(50)
            .MustAsync(BeUniqueTitle).WithMessage("این عنوان واحد قبلاً ثبت شده است.");

        RuleFor(x => x.Symbol)
            .NotEmpty().WithMessage("نماد واحد الزامی است.")
            .MaximumLength(10)
            .MustAsync(BeUniqueSymbol).WithMessage("این نماد واحد قبلاً ثبت شده است.");

        RuleFor(x => x.Precision)
            .GreaterThanOrEqualTo(0)
            .LessThan(6).WithMessage("دقت اعشار باید بین 0 تا 5 باشد.");

        // بررسی وجود واحد پایه (اگر انتخاب شده باشد)
        RuleFor(x => x.BaseUnitId)
            .MustAsync(async (id, token) => 
            {
                if (!id.HasValue) return true;
                return await _context.Units.AnyAsync(u => u.Id == id, token);
            })
            .WithMessage("واحد پایه انتخاب شده در سیستم وجود ندارد.");
    }

    private async Task<bool> BeUniqueTitle(string title, CancellationToken token)
    {
        return !await _context.Units.AnyAsync(u => u.Title == title, token);
    }

    private async Task<bool> BeUniqueSymbol(string symbol, CancellationToken token)
    {
        return !await _context.Units.AnyAsync(u => u.Symbol == symbol, token);
    }
}

public class CreateUnitHandler : IRequestHandler<CreateUnitCommand, int>
{
    private readonly IApplicationDbContext _context; // <--- تغییر به اینترفیس
    private readonly ICacheService _cacheService;


    public CreateUnitHandler(IApplicationDbContext context, ICacheService cacheService)
    {
        _context = context;
        _cacheService = cacheService;
    }

    public async Task<int> Handle(CreateUnitCommand request, CancellationToken cancellationToken)
    {
        var entity = new DomainUnit // <--- استفاده از Alias
        {
            Title = request.Title,
            Symbol = request.Symbol,
            Precision = request.Precision,
            IsActive = true,
            BaseUnitId = request.BaseUnitId,
            ConversionFactor = request.ConversionFactor
        };

        _context.Units.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return entity.Id;
    }
}