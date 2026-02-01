using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.Interfaces; // <--- رفرنس صحیح اینجاست
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.CreateInventoryDoc;

[CacheInvalidation("InventoryDocs")]
public record CreateInventoryDocCommand : IRequest<long>
{
    // ... (فیلدها مثل قبل) ...
    public required int DocTypeId { get; set; }
    public required int WarehouseId { get; set; }
    public int? DestinationWarehouseId { get; set; }
    public DateTime DocDate { get; set; } = DateTime.UtcNow;
    public int? FiscalYearId { get; set; }
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
    public int? BatchId { get; set; }
    public string? Description { get; set; }
}

public class CreateInventoryDocValidator : AbstractValidator<CreateInventoryDocCommand>
{
    public CreateInventoryDocValidator()
    {
        RuleFor(x => x.DocTypeId).GreaterThan(0);
        RuleFor(x => x.WarehouseId).GreaterThan(0);
        RuleFor(x => x.DocDate).NotEmpty();
        RuleForEach(x => x.Details).ChildRules(detail =>
        {
            detail.RuleFor(d => d.ProductId).GreaterThan(0);
            detail.RuleFor(d => d.MainUnitQuantity).GreaterThan(0);
            detail.RuleFor(d => d.LocationId).GreaterThan(0);
        });
    }
}

public class CreateInventoryDocHandler : IRequestHandler<CreateInventoryDocCommand, long>
{
    private readonly IApplicationDbContext _context;
    private readonly IDocumentNumberingService _numberingService; // استفاده از اینترفیس

    public CreateInventoryDocHandler(
        IApplicationDbContext context, 
        IDocumentNumberingService numberingService)
    {
        _context = context;
        _numberingService = numberingService;
    }

    public async Task<long> Handle(CreateInventoryDocCommand request, CancellationToken cancellationToken)
    {
        var docType = await _context.InventoryDocTypes
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.DocTypeId, cancellationToken);

        if (docType == null)
            throw new KeyNotFoundException("نوع سند انتخاب شده یافت نشد.");

        // فراخوانی سرویس بدون مشکل تایپ
        long docNumber = await _numberingService.GetNextDocNumberAsync(
            docType.Id, 
            request.FiscalYearId, 
            docType.NumberingScope, 
            cancellationToken);

        var docHeader = new InventoryDocHeader
        {
            DocTypeId = request.DocTypeId,
            WarehouseId = request.WarehouseId,
            DestinationWarehouseId = request.DestinationWarehouseId,
            DocDate = request.DocDate,
            FiscalYearId = request.FiscalYearId,
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

        foreach (var item in request.Details)
        {
            docHeader.Details.Add(new InventoryDocDetail
            {
                ProductId = item.ProductId,
                MainUnitQuantity = item.MainUnitQuantity,
                SubUnitQuantity = item.SubUnitQuantity,
                LocationId = item.LocationId,
                BatchId = item.BatchId,
                Description = item.Description
            });
        }

        _context.InventoryDocHeaders.Add(docHeader);
        await _context.SaveChangesAsync(cancellationToken);

        return docHeader.Id;
    }
}