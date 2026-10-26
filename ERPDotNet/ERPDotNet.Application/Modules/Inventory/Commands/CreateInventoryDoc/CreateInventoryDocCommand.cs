using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.BaseInfo.Contracts;
using ERPDotNet.Application.Modules.Inventory.Interfaces; // <--- رفرنس صحیح اینجاست
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ERPDotNet.Application.Modules.Inventory.Services;

namespace ERPDotNet.Application.Modules.Inventory.Commands.CreateInventoryDoc;

[CacheInvalidation("InventoryDocs")]
public record CreateInventoryDocCommand : IRequest<long>, IWarehouseScopedRequest
{
    IEnumerable<int> IWarehouseScopedRequest.ScopedWarehouseIds => [WarehouseId];
    // ... (فیلدها مثل قبل) ...
    public required int DocTypeId { get; set; }
    public required int WarehouseId { get; set; }
    public int? DestinationWarehouseId { get; set; }
    public DateTime DocDate { get; set; } = DateTime.UtcNow;
    public string? ReferenceEntityName { get; set; }
    public long? ReferenceEntityId { get; set; }
    public string? ReferenceExternalCode { get; set; }
    public string? TargetPartyType { get; set; }
    public string? TargetPartyId { get; set; }
    public string? TargetPartyName { get; set; }
    public string? Description { get; set; }
    public List<CreateInventoryDocDetailDto> Details { get; set; } = new();
}

public record CreateInventoryDocDetailDto
{
    public int ProductId { get; set; }
    public decimal MainUnitQuantity { get; set; }
    public decimal SubUnitQuantity { get; set; }
    public int LocationId { get; set; }
    // فقط برای سند انتقال
    public int? DestinationLocationId { get; set; }
    public int? BatchId { get; set; }
    public string? Description { get; set; }
    // فقط برای کالای سریال‌دار
    public List<string> SerialNumbers { get; set; } = new();
    // ردیابی سطر: نقش سطر در سند مرجع و شناسه سطر مرجع (مثلاً ماده اولیه سفارش تولید)
    public string? ReferenceEntityName { get; set; }
    public long? ReferenceEntityLineId { get; set; }
    // بهای واحد سطر رسید (به واحد اصلی)؛ خالی یعنی با مرجع یا میانگین ارزش‌گذاری شود
    public decimal? UnitCost { get; set; }
}

public class CreateInventoryDocValidator : AbstractValidator<CreateInventoryDocCommand>
{
    public CreateInventoryDocValidator(IApplicationDbContext context)
    {
        RuleFor(x => x.DocTypeId).GreaterThan(0);
        RuleFor(x => x.WarehouseId).GreaterThan(0);
        RuleFor(x => x).CustomAsync(async (cmd, validation, ct) =>
        {
            var lines = cmd.Details
                .Select((d, i) => new InventoryDocRules.Line(i + 1, d.LocationId, d.DestinationLocationId))
                .ToList();
            var errors = await InventoryDocRules.ValidateAsync(context, cmd.DocTypeId, cmd.WarehouseId, cmd.DestinationWarehouseId, lines, ct);
            errors.ForEach(validation.AddFailure);
        });
        RuleFor(x => x).Custom((cmd, validation) =>
            InventoryDocRules.ValidateSerials(cmd.Details.Select(d => (d.ProductId, (IEnumerable<string>?)d.SerialNumbers)))
                .ForEach(validation.AddFailure));
        RuleFor(x => x.DocDate).NotEmpty();
        RuleForEach(x => x.Details).ChildRules(detail =>
        {
            detail.RuleFor(d => d.ProductId).GreaterThan(0);
            detail.RuleFor(d => d.MainUnitQuantity).GreaterThan(0);
            detail.RuleFor(d => d.LocationId).GreaterThan(0);
            detail.RuleFor(d => d.UnitCost).GreaterThanOrEqualTo(0).WithMessage("بهای واحد نمی‌تواند منفی باشد.");
        });
    }
}

public class CreateInventoryDocHandler : IRequestHandler<CreateInventoryDocCommand, long>
{
    private readonly IApplicationDbContext _context;
    private readonly IDocumentNumberingService _numberingService; // استفاده از اینترفیس
    private readonly IFiscalYearService _fiscalYears;

    public CreateInventoryDocHandler(
        IApplicationDbContext context, 
        IDocumentNumberingService numberingService,
        IFiscalYearService fiscalYears)
    {
        _context = context;
        _numberingService = numberingService;
        _fiscalYears = fiscalYears;
    }

    public async Task<long> Handle(CreateInventoryDocCommand request, CancellationToken cancellationToken)
    {
        var docType = await _context.InventoryDocTypes
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.DocTypeId, cancellationToken);

        if (docType == null)
            throw new KeyNotFoundException("نوع سند انتخاب شده یافت نشد.");

        // سال مالی از تاریخ سند و شرکتِ انبار تعیین می‌شود، نه از ورودی کاربر
        var fiscalYearId = await InventoryDocRules.ResolveFiscalYearAsync(
            _context, _fiscalYears, request.WarehouseId, request.DocDate, cancellationToken);

        // فراخوانی سرویس بدون مشکل تایپ
        long docNumber = await _numberingService.GetNextDocNumberAsync(
            docType.Id, 
            fiscalYearId, 
            docType.NumberingScope, 
            cancellationToken);

        var docHeader = new InventoryDocHeader
        {
            DocTypeId = request.DocTypeId,
            WarehouseId = request.WarehouseId,
            DestinationWarehouseId = request.DestinationWarehouseId,
            DocDate = request.DocDate,
            FiscalYearId = fiscalYearId,
            DocNumber = docNumber,
            Status = InventoryDocStatus.Draft,
            ReferenceEntityName = request.ReferenceEntityName,
            ReferenceEntityId = request.ReferenceEntityId,
            ReferenceExternalCode = request.ReferenceExternalCode,
            TargetPartyType = request.TargetPartyType,
            TargetPartyId = request.TargetPartyId,
            TargetPartyName = request.TargetPartyName,
            Description = request.Description
        };

        var isTransfer = await InventoryDocRules.IsTransferAsync(_context, request.DocTypeId, cancellationToken);
        foreach (var item in request.Details)
        {
            docHeader.Details.Add(new InventoryDocDetail
            {
                ProductId = item.ProductId,
                MainUnitQuantity = item.MainUnitQuantity,
                SubUnitQuantity = item.SubUnitQuantity,
                LocationId = item.LocationId,
                DestinationLocationId = isTransfer ? item.DestinationLocationId : null,
                BatchId = item.BatchId,
                Description = item.Description,
                ReferenceEntityName = item.ReferenceEntityName,
                ReferenceEntityLineId = item.ReferenceEntityLineId,
                UnitCost = item.UnitCost,
                Serials = InventoryDocRules.NormalizeSerials(item.SerialNumbers)
                    .Select(s => new InventoryDocDetailSerial { SerialNumber = s })
                    .ToList()
            });
        }

        _context.InventoryDocHeaders.Add(docHeader);
        await _context.SaveChangesAsync(cancellationToken);

        return docHeader.Id;
    }
}