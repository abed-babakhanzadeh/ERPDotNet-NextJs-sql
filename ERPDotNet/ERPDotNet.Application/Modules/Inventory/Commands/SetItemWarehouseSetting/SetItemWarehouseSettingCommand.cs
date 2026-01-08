using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.SetItemWarehouseSetting;

[CacheInvalidation("ItemWarehouseSettings")]
public record SetItemWarehouseSettingCommand : IRequest<int>
{
    public int WarehouseId { get; set; }
    public int ProductId { get; set; }
    
    public decimal ReorderPoint { get; set; }
    public decimal MaxStock { get; set; }
    public decimal MinStock { get; set; }
    
    public int? DefaultLocationId { get; set; }
}

public class SetItemWarehouseSettingValidator : AbstractValidator<SetItemWarehouseSettingCommand>
{
    private readonly IApplicationDbContext _context;

    public SetItemWarehouseSettingValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(x => x.WarehouseId).GreaterThan(0);
        RuleFor(x => x.ProductId).GreaterThan(0);
        RuleFor(x => x.ReorderPoint).GreaterThanOrEqualTo(0);
        RuleFor(x => x.MaxStock).GreaterThanOrEqualTo(x => x.ReorderPoint);

        RuleFor(x => x)
            .MustAsync(LocationBelongsToWarehouse)
            .When(x => x.DefaultLocationId.HasValue)
            .WithMessage("موقعیت پیش‌فرض انتخاب شده متعلق به این انبار نیست.");
    }

    private async Task<bool> LocationBelongsToWarehouse(SetItemWarehouseSettingCommand command, CancellationToken token)
    {
        if (!command.DefaultLocationId.HasValue) return true;
        
        return await _context.Locations
            .AnyAsync(l => l.Id == command.DefaultLocationId && l.WarehouseId == command.WarehouseId, token);
    }
}

public class SetItemWarehouseSettingHandler : IRequestHandler<SetItemWarehouseSettingCommand, int>
{
    private readonly IApplicationDbContext _context;

    public SetItemWarehouseSettingHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(SetItemWarehouseSettingCommand request, CancellationToken cancellationToken)
    {
        // 1. یافتن پروفایل
        var profile = await _context.InventoryItemProfiles
            .FirstOrDefaultAsync(p => p.ProductId == request.ProductId, cancellationToken);

        if (profile == null)
        {
            throw new ValidationException("برای این کالا هنوز پروفایل انبارداری تعریف نشده است.");
        }

        // 2. یافتن تنظیمات موجود
        var setting = await _context.ItemWarehouseSettings
            .FirstOrDefaultAsync(x => x.WarehouseId == request.WarehouseId && x.InventoryItemProfileId == profile.Id, cancellationToken);

        if (setting == null)
        {
            setting = new ItemWarehouseSetting
            {
                WarehouseId = request.WarehouseId,
                InventoryItemProfileId = profile.Id,
                ReorderPoint = request.ReorderPoint,
                MaxStock = request.MaxStock,
                MinStock = request.MinStock,
                DefaultLocationId = request.DefaultLocationId
            };
            _context.ItemWarehouseSettings.Add(setting);
        }
        else
        {
            setting.ReorderPoint = request.ReorderPoint;
            setting.MaxStock = request.MaxStock;
            setting.MinStock = request.MinStock;
            setting.DefaultLocationId = request.DefaultLocationId;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return setting.Id;
    }
}