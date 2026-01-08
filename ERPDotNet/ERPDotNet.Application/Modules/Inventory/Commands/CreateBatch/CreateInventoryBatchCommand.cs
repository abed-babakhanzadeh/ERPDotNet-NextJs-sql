using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.CreateBatch;

[CacheInvalidation("InventoryBatches")]
public record CreateInventoryBatchCommand : IRequest<int>
{
    public required int ProductId { get; set; }
    public required string BatchNumber { get; set; }
    public DateTime? ManufactureDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    
    // فیلدهای جدید فعال شدند
    public string? SupplierBatchCode { get; set; }
    public string? Description { get; set; }
}

public class CreateInventoryBatchValidator : AbstractValidator<CreateInventoryBatchCommand>
{
    private readonly IApplicationDbContext _context;

    public CreateInventoryBatchValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(x => x.ProductId).GreaterThan(0);
        RuleFor(x => x.BatchNumber).NotEmpty().MaximumLength(50);
        RuleFor(x => x.SupplierBatchCode).MaximumLength(50);
        RuleFor(x => x.Description).MaximumLength(500);

        RuleFor(x => x)
            .Must(x => !x.ExpiryDate.HasValue || !x.ManufactureDate.HasValue || x.ExpiryDate > x.ManufactureDate)
            .WithMessage("تاریخ انقضا باید بعد از تاریخ تولید باشد.");

        RuleFor(x => x)
            .MustAsync(BeUniqueBatchForProduct)
            .WithMessage("این شماره بچ قبلاً برای این کالا ثبت شده است.");
    }

    private async Task<bool> BeUniqueBatchForProduct(CreateInventoryBatchCommand command, CancellationToken token)
    {
        return !await _context.InventoryBatches
            .AnyAsync(b => b.ProductId == command.ProductId && b.BatchNumber == command.BatchNumber, token);
    }
}

public class CreateInventoryBatchHandler : IRequestHandler<CreateInventoryBatchCommand, int>
{
    private readonly IApplicationDbContext _context;

    public CreateInventoryBatchHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CreateInventoryBatchCommand request, CancellationToken cancellationToken)
    {
        // 1. دریافت پروفایل کالا
        var profile = await _context.InventoryItemProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.ProductId == request.ProductId, cancellationToken);
            
        // === اصلاح Tier-0: سخت‌گیری مطلق ===
        
        // اگر پروفایل وجود ندارد -> خطا (نباید اجازه دهیم بچ روی هوا ساخته شود)
        if (profile == null)
        {
            throw new ValidationException("برای این کالا هیچ پروفایل انبارداری تعریف نشده است. لطفاً ابتدا در قسمت 'تنظیمات کالا'، مشخصات انبارداری را ثبت کنید.");
        }

        // اگر پروفایل هست ولی تیک بچ ندارد -> خطا
        if (!profile.IsBatchManaged)
        {
            throw new ValidationException("این کالا به عنوان 'بچ‌دار' (Batch Managed) پیکربندی نشده است. امکان تعریف بچ وجود ندارد.");
        }

        // 2. ساخت بچ
        var batch = new InventoryBatch
        {
            ProductId = request.ProductId,
            BatchNumber = request.BatchNumber,
            ManufactureDate = request.ManufactureDate,
            ExpiryDate = request.ExpiryDate,
            SupplierBatchCode = request.SupplierBatchCode,
            Description = request.Description,
            IsBlocked = false // وضعیت پیش‌فرض: آزاد
        };

        _context.InventoryBatches.Add(batch);
        await _context.SaveChangesAsync(cancellationToken);

        return batch.Id;
    }

}