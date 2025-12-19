// راه حل تداخل نام: استفاده از Alias
using DomainUnit = ERPDotNet.Domain.Modules.BaseInfo.Entities.Unit; 
using ERPDotNet.Application.Common.Interfaces; // استفاده از اینترفیس
using FluentValidation;
using MediatR;
using ERPDotNet.Application.Common.Attributes;

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
    public CreateUnitValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Symbol).NotEmpty().MaximumLength(10);
        RuleFor(x => x.Precision).GreaterThanOrEqualTo(0).LessThan(6);
        
        // اگر واحد پایه انتخاب شده، ضریب نباید 1 یا 0 باشد
        RuleFor(x => x.ConversionFactor).GreaterThan(0);
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