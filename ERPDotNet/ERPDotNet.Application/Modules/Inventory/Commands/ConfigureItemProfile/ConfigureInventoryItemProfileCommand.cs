using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.ConfigureItemProfile;

[CacheInvalidation("InventoryProfiles")]
public record ConfigureInventoryItemProfileCommand : IRequest<int>
{
    public int ProductId { get; set; }
    
    public bool IsBatchManaged { get; set; }
    public bool IsSerialManaged { get; set; }
    public int? ShelfLifeDays { get; set; }
    public int MainInventoryUnitId { get; set; }

    // تنظیمات پیش‌فرض برای انبارها (اختیاری - فعلاً لیست خالی می‌گیریم تا ساده باشد)
    // در آینده می‌توان لیست ItemWarehouseSetting را هم اینجا گرفت
}

public class ConfigureInventoryItemProfileValidator : AbstractValidator<ConfigureInventoryItemProfileCommand>
{
    public ConfigureInventoryItemProfileValidator()
    {
        RuleFor(x => x.ProductId).GreaterThan(0);
        RuleFor(x => x.MainInventoryUnitId).GreaterThan(0);
        
        // همزمان بچ و سریال نمی‌تواند باشد (مگر اینکه لاجیک خاصی داشته باشید)
        RuleFor(x => x).Must(x => !(x.IsBatchManaged && x.IsSerialManaged))
            .WithMessage("کالا نمی‌تواند همزمان دارای بچ و سریال باشد (یکی را انتخاب کنید).");
    }
}

public class ConfigureInventoryItemProfileHandler : IRequestHandler<ConfigureInventoryItemProfileCommand, int>
{
    private readonly IApplicationDbContext _context;

    public ConfigureInventoryItemProfileHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(ConfigureInventoryItemProfileCommand request, CancellationToken cancellationToken)
    {
        // 1. چک کنیم آیا کالا وجود دارد؟
        var productExists = await _context.Products.AnyAsync(p => p.Id == request.ProductId, cancellationToken);
        if (!productExists) throw new KeyNotFoundException("کالا یافت نشد.");

        // 2. چک کنیم آیا پروفایل قبلاً وجود دارد؟ (Upsert Logic)
        var profile = await _context.InventoryItemProfiles
            .FirstOrDefaultAsync(x => x.ProductId == request.ProductId, cancellationToken);

        if (profile == null)
        {
            // ایجاد جدید
            profile = new InventoryItemProfile
            {
                ProductId = request.ProductId,
                MainInventoryUnitId = request.MainInventoryUnitId,
                IsBatchManaged = request.IsBatchManaged,
                IsSerialManaged = request.IsSerialManaged,
                ShelfLifeDays = request.ShelfLifeDays
            };
            _context.InventoryItemProfiles.Add(profile);
        }
        else
        {
            // ویرایش موجود
            profile.MainInventoryUnitId = request.MainInventoryUnitId;
            profile.IsBatchManaged = request.IsBatchManaged;
            profile.IsSerialManaged = request.IsSerialManaged;
            profile.ShelfLifeDays = request.ShelfLifeDays;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return profile.Id;
    }
}