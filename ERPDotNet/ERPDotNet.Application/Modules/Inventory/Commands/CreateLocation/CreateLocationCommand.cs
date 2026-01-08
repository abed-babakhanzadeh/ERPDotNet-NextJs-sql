using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.CreateLocation;

[CacheInvalidation("Locations")]
public record CreateLocationCommand : IRequest<int>
{
    public required int WarehouseId { get; set; }
    public required string Title { get; set; }
    public required string Code { get; set; }
    
    // فیلد درختی فعال شد
    public int? ParentId { get; set; }
}

public class CreateLocationValidator : AbstractValidator<CreateLocationCommand>
{
    private readonly IApplicationDbContext _context;

    public CreateLocationValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(x => x.WarehouseId).GreaterThan(0);
        RuleFor(x => x.Title).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);

        RuleFor(x => x)
            .MustAsync(BeUniqueCodeInWarehouse)
            .WithMessage("این کد موقعیت قبلاً در این انبار تعریف شده است.");

        // ولیدیشن مهم والد: والد باید حتماً در همین انبار باشد
        RuleFor(x => x)
            .MustAsync(ParentMustBelongToSameWarehouse)
            .When(x => x.ParentId.HasValue)
            .WithMessage("موقعیت والد (Parent) یافت نشد یا متعلق به انبار دیگری است.");
    }

    private async Task<bool> BeUniqueCodeInWarehouse(CreateLocationCommand command, CancellationToken token)
    {
        return !await _context.Locations
            .AnyAsync(l => l.WarehouseId == command.WarehouseId 
                           && l.Code == command.Code, token);
    }

    private async Task<bool> ParentMustBelongToSameWarehouse(CreateLocationCommand command, CancellationToken token)
    {
        if (!command.ParentId.HasValue) return true;
        
        return await _context.Locations
            .AnyAsync(l => l.Id == command.ParentId 
                           && l.WarehouseId == command.WarehouseId, token);
    }
}

public class CreateLocationHandler : IRequestHandler<CreateLocationCommand, int>
{
    private readonly IApplicationDbContext _context;

    public CreateLocationHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CreateLocationCommand request, CancellationToken cancellationToken)
    {
        // 1. چک کردن وجود انبار
        var warehouseExists = await _context.Warehouses.AnyAsync(w => w.Id == request.WarehouseId, cancellationToken);
        if (!warehouseExists) throw new KeyNotFoundException("انبار مورد نظر یافت نشد.");

        // 2. محاسبه Path (الگوی Materialized Path)
        string fullPath = request.Code; // پیش‌فرض (اگر ریشه باشد)

        if (request.ParentId.HasValue)
        {
            // والد را لود می‌کنیم تا مسیرش را بخوانیم
            var parent = await _context.Locations
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == request.ParentId, cancellationToken);
            
            if (parent != null)
            {
                // مسیر والد + / + کد جاری
                fullPath = $"{parent.Path}/{request.Code}";
            }
        }

        var location = new Location
        {
            WarehouseId = request.WarehouseId,
            Title = request.Title,
            Code = request.Code,
            ParentId = request.ParentId,
            
            // ذخیره مسیر محاسبه شده
            Path = fullPath,
            
            IsBlocked = false
        };

        _context.Locations.Add(location);
        await _context.SaveChangesAsync(cancellationToken);

        return location.Id;
    }
}