using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.Services;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.ValuationSettings;

/// <param name="Implemented">موتور این گزینه ساخته شده و قابل انتخاب است</param>
public record ValuationOptionDto(int Value, string Title, bool Implemented);

/// <param name="IsLocked">برای این سیستم تراکنش ارزش‌گذاری‌شده ثبت شده؛ روش و سطح دیگر قابل تغییر نیست</param>
public record ValuationSettingsDto(
    int Method,
    int Level,
    int ProductionCostBasis,
    bool IsLocked,
    List<ValuationOptionDto> Methods,
    List<ValuationOptionDto> Levels,
    List<ValuationOptionDto> ProductionCostBases,
    byte[] RowVersion
);

public record GetValuationSettingsQuery : IRequest<ValuationSettingsDto>;

public record UpdateValuationSettingsCommand : IRequest<bool>
{
    public ValuationMethod Method { get; set; }
    public ValuationLevel Level { get; set; }
    public ProductionCostBasis ProductionCostBasis { get; set; }
    public byte[]? RowVersion { get; set; }
}

/// <summary>گزینه‌هایی که موتورشان ساخته شده؛ بقیه در تنظیمات دیده می‌شوند ولی انتخاب نمی‌شوند</summary>
public static class ValuationCapabilities
{
    public static bool IsImplemented(ValuationMethod method) => method is ValuationMethod.MovingAverage or ValuationMethod.Fifo;
    public static bool IsImplemented(ValuationLevel level) => level is ValuationLevel.Company or ValuationLevel.Warehouse;
    public static bool IsImplemented(ProductionCostBasis basis) => basis is ProductionCostBasis.MaterialsOnly or ProductionCostBasis.MaterialsAndWorkCenters;

    public static Task<bool> IsLockedAsync(IApplicationDbContext context, CancellationToken ct) =>
        context.InventoryTransactions.AnyAsync(t => t.TotalCost != null, ct);
}

public class UpdateValuationSettingsValidator : AbstractValidator<UpdateValuationSettingsCommand>
{
    public UpdateValuationSettingsValidator()
    {
        RuleFor(x => x.Method).IsInEnum().WithMessage("روش ارزش‌گذاری نامعتبر است.");
        RuleFor(x => x.Level).IsInEnum().WithMessage("سطح میانگین نامعتبر است.");
        RuleFor(x => x.ProductionCostBasis).IsInEnum().WithMessage("مبنای بهای تولید نامعتبر است.");
    }
}

public class ValuationSettingsHandler :
    IRequestHandler<GetValuationSettingsQuery, ValuationSettingsDto>,
    IRequestHandler<UpdateValuationSettingsCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public ValuationSettingsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ValuationSettingsDto> Handle(GetValuationSettingsQuery request, CancellationToken cancellationToken)
    {
        var s = await InventoryValuationSettingsReader.GetAsync(_context, cancellationToken);
        return new ValuationSettingsDto(
            (int)s.Method, (int)s.Level, (int)s.ProductionCostBasis,
            await ValuationCapabilities.IsLockedAsync(_context, cancellationToken),
            Options<ValuationMethod>(ValuationCapabilities.IsImplemented),
            Options<ValuationLevel>(ValuationCapabilities.IsImplemented),
            Options<ProductionCostBasis>(ValuationCapabilities.IsImplemented),
            s.RowVersion ?? []);
    }

    public async Task<bool> Handle(UpdateValuationSettingsCommand request, CancellationToken cancellationToken)
    {
        if (!ValuationCapabilities.IsImplemented(request.Method) || !ValuationCapabilities.IsImplemented(request.Level)
            || !ValuationCapabilities.IsImplemented(request.ProductionCostBasis))
            throw new BusinessRuleException("گزینه انتخاب‌شده هنوز ساخته نشده است و فعلاً قابل انتخاب نیست.");

        var settings = await _context.InventoryValuationSettings.FirstOrDefaultAsync(s => s.Id == InventoryValuationSettings.SingletonId, cancellationToken);
        if (settings == null)
        {
            settings = new InventoryValuationSettings();
            _context.InventoryValuationSettings.Add(settings);
        }
        else if (request.RowVersion is { Length: > 0 })
        {
            _context.Entry(settings).Property(x => x.RowVersion).OriginalValue = request.RowVersion;
        }

        var methodOrLevelChanged = settings.Method != request.Method || settings.Level != request.Level;
        if (methodOrLevelChanged && await ValuationCapabilities.IsLockedAsync(_context, cancellationToken))
            throw new BusinessRuleException("برای این سیستم تراکنش ارزش‌گذاری‌شده ثبت شده است؛ روش و سطح ارزش‌گذاری دیگر قابل تغییر نیست. مبنای بهای تولید را می‌توانید تغییر دهید.");

        settings.Method = request.Method;
        settings.Level = request.Level;
        settings.ProductionCostBasis = request.ProductionCostBasis;

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

    private static List<ValuationOptionDto> Options<T>(Func<T, bool> implemented) where T : struct, Enum =>
        Enum.GetValues<T>().Select(v => new ValuationOptionDto(Convert.ToInt32(v), v.ToDisplay(), implemented(v))).ToList();
}
