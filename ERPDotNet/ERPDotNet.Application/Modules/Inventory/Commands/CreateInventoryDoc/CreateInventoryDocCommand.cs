using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.CreateInventoryDoc;

[CacheInvalidation("InventoryDocs")] // لیست اسناد باید رفرش شود
public record CreateInventoryDocCommand : IRequest<long>
{
    public required int DocTypeId { get; set; }
    public required int WarehouseId { get; set; }
    public int? DestinationWarehouseId { get; set; }
    public DateTime DocDate { get; set; } = DateTime.UtcNow;
    public int? FiscalYearId { get; set; } // سال مالی سند

    // رفرنس (مبنا)
    public string? ReferenceEntityName { get; set; }
    public long? ReferenceEntityId { get; set; }
    public string? ReferenceExternalCode { get; set; }

    // طرف حساب
    public string? TargetPartyType { get; set; }
    public string? TargetPartyId { get; set; }
    public string? TargetPartyName { get; set; }

    public string? Description { get; set; }

    public List<CreateInventoryDocDetailDto> Details { get; set; } = new();
}

public record CreateInventoryDocDetailDto
{
    public required int ProductId { get; set; }
    public decimal MainUnitQuantity { get; set; }
    public decimal SubUnitQuantity { get; set; }
    public int? SubUnitId { get; set; }
    
    // ردیابی (اختیاری در زمان ثبت اولیه، ولی برای Posting اجباری می‌شود)
    public int? LocationId { get; set; }
    public int? BatchId { get; set; }

    public string? Description { get; set; }
    
    // رفرنس سطح سطر
    public string? ReferenceEntityName { get; set; }
    public long? ReferenceEntityLineId { get; set; }
}

public class CreateInventoryDocValidator : AbstractValidator<CreateInventoryDocCommand>
{
    private readonly IApplicationDbContext _context;

    public CreateInventoryDocValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(x => x.DocTypeId).GreaterThan(0);
        RuleFor(x => x.WarehouseId).GreaterThan(0);
        RuleFor(x => x.DocDate).NotEmpty();
        
        // ولیدیشن اقلام
        RuleForEach(x => x.Details).ChildRules(d => {
            d.RuleFor(i => i.ProductId).GreaterThan(0);
            d.RuleFor(i => i.MainUnitQuantity).GreaterThan(0).WithMessage("مقدار باید بزرگتر از صفر باشد.");
        });

        // === Tier-0 Validation: چک کردن قوانین نوع سند ===
        RuleFor(x => x)
            .MustAsync(SatisfyDocTypeRules)
            .WithMessage("قوانین نوع سند رعایت نشده است (مبنای اجباری یا نامعتبر).");
    }

    private async Task<bool> SatisfyDocTypeRules(CreateInventoryDocCommand command, CancellationToken token)
    {
        var docType = await _context.InventoryDocTypes
            .Include(x => x.AllowedReferences)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == command.DocTypeId, token);

        if (docType == null) return false; // هندلر خطای Not Found می‌دهد

        // 1. چک کردن اجباری بودن مبنا
        if (docType.IsReferenceRequired)
        {
            if (string.IsNullOrEmpty(command.ReferenceEntityName) || command.ReferenceEntityId == null)
            {
                return false; // مبنا اجباری است ولی پر نشده
            }
        }

        // 2. چک کردن نوع مبنای مجاز
        if (!string.IsNullOrEmpty(command.ReferenceEntityName) && docType.AllowedReferences.Any())
        {
            var isAllowed = docType.AllowedReferences
                .Any(r => r.ReferenceEntityName == command.ReferenceEntityName);
            
            if (!isAllowed) return false; // نوع مبنا غیرمجاز است
        }

        return true;
    }
}

public class CreateInventoryDocHandler : IRequestHandler<CreateInventoryDocCommand, long>
{
    private readonly IApplicationDbContext _context;

    public CreateInventoryDocHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<long> Handle(CreateInventoryDocCommand request, CancellationToken cancellationToken)
    {
        // 1. دریافت نوع سند (برای شماره‌گذاری نیاز داریم)
        var docType = await _context.InventoryDocTypes
            .FirstOrDefaultAsync(x => x.Id == request.DocTypeId, cancellationToken);
            
        if (docType == null) throw new KeyNotFoundException("نوع سند یافت نشد.");

        // 2. === Tier-0 Logic: تولید شماره سند هوشمند ===
        long nextDocNumber = await GenerateNextDocNumberAsync(docType, request.FiscalYearId, cancellationToken);

        // 3. ساخت هدر
        var header = new InventoryDocHeader
        {
            WarehouseId = request.WarehouseId,
            DestinationWarehouseId = request.DestinationWarehouseId,
            DocTypeId = request.DocTypeId,
            DocDate = request.DocDate,
            FiscalYearId = request.FiscalYearId,
            DocNumber = nextDocNumber, // شماره محاسبه شده
            
            Status = InventoryDocStatus.Draft, // همیشه Draft
            
            ReferenceEntityName = request.ReferenceEntityName,
            ReferenceEntityId = request.ReferenceEntityId,
            ReferenceExternalCode = request.ReferenceExternalCode,
            
            TargetPartyType = request.TargetPartyType,
            TargetPartyId = request.TargetPartyId,
            TargetPartyName = request.TargetPartyName,
            
            Description = request.Description
        };

        // 4. ساخت اقلام
        foreach (var detailDto in request.Details)
        {
            header.Details.Add(new InventoryDocDetail
            {
                ProductId = detailDto.ProductId,
                MainUnitQuantity = detailDto.MainUnitQuantity,
                SubUnitQuantity = detailDto.SubUnitQuantity,
                SubUnitId = detailDto.SubUnitId,
                
                LocationId = detailDto.LocationId,
                BatchId = detailDto.BatchId,
                
                ReferenceEntityName = detailDto.ReferenceEntityName,
                ReferenceEntityLineId = detailDto.ReferenceEntityLineId,
                
                Description = detailDto.Description
            });
        }

        _context.InventoryDocHeaders.Add(header);
        
        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex)
        {
            // هندل کردن خطای احتمالی تکراری بودن شماره سند (در سیستم‌های پرترافیک)
            if (ex.InnerException?.Message.Contains("IX_") == true) // چک ساده برای ایندکس یونیک
            {
                throw new Exception("خطای همزمانی در تولید شماره سند. لطفاً مجدد تلاش کنید.");
            }
            throw;
        }

        return header.Id;
    }

    // متد کمکی تولید شماره سند (Logic جداگانه برای تمیزی کد)
    private async Task<long> GenerateNextDocNumberAsync(InventoryDocType docType, int? fiscalYearId, CancellationToken token)
    {
        // کوئری پایه روی هدرها
        var query = _context.InventoryDocHeaders.AsQueryable();

        // فیلتر بر اساس Scope
        switch (docType.NumberingScope)
        {
            case NumberingScope.Global:
                // کل سیستم: Max + 1
                break;

            case NumberingScope.PerFiscalYear:
                // فقط در این سال مالی
                if (fiscalYearId == null) 
                    throw new InvalidOperationException("برای شماره‌گذاری سالیانه، سال مالی الزامی است.");
                query = query.Where(x => x.FiscalYearId == fiscalYearId);
                break;

            case NumberingScope.PerDocType:
                // فقط برای این نوع سند
                query = query.Where(x => x.DocTypeId == docType.Id);
                // اگر ترکیبی بخواهیم (سال + نوع سند)، باید شرط سال را هم اضافه کنیم (معمولاً در ERPها اینطوره)
                if (fiscalYearId != null) 
                    query = query.Where(x => x.FiscalYearId == fiscalYearId);
                break;
        }

        // محاسبه Max
        // نکته: اگر هیچ رکوردی نباشد Max مقدار پیش‌فرض (0) برمی‌گرداند (در صورت هندل کردن نال)
        // اما EF Core روی جدول خالی با Max ممکن است خطا بدهد یا نال بدهد.
        // روش امن: Select(x => (long?)x.DocNumber).MaxAsync() ?? 0;
        
        var maxNumber = await query
            .Select(x => (long?)x.DocNumber)
            .MaxAsync(token);

        return (maxNumber ?? 0) + 1;
    }
}