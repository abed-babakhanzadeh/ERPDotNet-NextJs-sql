using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.Commands.CreateInventoryDoc;
using ERPDotNet.Application.Modules.Inventory.Contracts;
using ERPDotNet.Application.Modules.Production.Services;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using ERPDotNet.Domain.Modules.Production.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Production.Commands.ExecuteProductionOrder;

/// <summary>
/// حواله مواد سفارش تولید: یک سند صادره پیش‌نویس با ارجاع به سفارش و سطر نیاز مواد می‌سازد.
/// بچ، سریال و قفسه دقیق هر سطر در فرم سند انبار تکمیل و سند با گردش کار معمول انبار قطعی می‌شود.
/// </summary>
public record IssueProductionMaterialsCommand : IRequest<long>
{
    public int Id { get; set; }
    public int DocTypeId { get; set; }
    public int WarehouseId { get; set; }
    public DateTime DocDate { get; set; } = DateTime.UtcNow;
    // قفسه پیش‌فرض همه سطرها
    public int LocationId { get; set; }
    public List<IssueProductionMaterialLine> Lines { get; set; } = new();
}

public record IssueProductionMaterialLine
{
    public int MaterialId { get; set; }
    public decimal Quantity { get; set; }
}

/// <summary>
/// رسید محصول و ضایعات سفارش تولید: یک سند وارده پیش‌نویس با سطر محصول سالم و (در صورت وجود) سطر ضایعات.
/// ضایعات هم وارد موجودی می‌شود تا ردیابی شود؛ برای جلوگیری از مصرف، قفسه یا انبار ضایعات جدا انتخاب کنید.
/// </summary>
public record ReceiveProductionOutputCommand : IRequest<long>
{
    public int Id { get; set; }
    public int DocTypeId { get; set; }
    public int WarehouseId { get; set; }
    public DateTime DocDate { get; set; } = DateTime.UtcNow;
    public decimal Quantity { get; set; }
    public int LocationId { get; set; }
    public decimal ScrapQuantity { get; set; }
    // پیش‌فرض: همان قفسه محصول
    public int? ScrapLocationId { get; set; }
}

/// <summary>تکمیل سفارش: همه اسناد انبار مرتبط قطعی یا باطل شده‌اند و محصولی دریافت شده است</summary>
public record CompleteProductionOrderCommand(int Id) : IRequest<bool>;

public class IssueProductionMaterialsValidator : AbstractValidator<IssueProductionMaterialsCommand>
{
    public IssueProductionMaterialsValidator()
    {
        RuleFor(x => x.DocTypeId).GreaterThan(0).WithName("نوع سند");
        RuleFor(x => x.WarehouseId).GreaterThan(0).WithName("انبار");
        RuleFor(x => x.LocationId).GreaterThan(0).WithName("قفسه");
        RuleFor(x => x.Lines).NotEmpty().WithMessage("حداقل یک ماده اولیه با مقدار بیشتر از صفر وارد کنید.");
        RuleFor(x => x.Lines)
            .Must(lines => lines.Select(l => l.MaterialId).Distinct().Count() == lines.Count)
            .WithMessage("هر ماده اولیه فقط یک بار در حواله می‌آید.");
        RuleForEach(x => x.Lines).ChildRules(line =>
            line.RuleFor(l => l.Quantity).GreaterThan(0).WithName("مقدار"));
    }
}

public class ReceiveProductionOutputValidator : AbstractValidator<ReceiveProductionOutputCommand>
{
    public ReceiveProductionOutputValidator()
    {
        RuleFor(x => x.DocTypeId).GreaterThan(0).WithName("نوع سند");
        RuleFor(x => x.WarehouseId).GreaterThan(0).WithName("انبار");
        RuleFor(x => x.LocationId).GreaterThan(0).WithName("قفسه");
        RuleFor(x => x.Quantity).GreaterThanOrEqualTo(0).WithName("مقدار محصول");
        RuleFor(x => x.ScrapQuantity).GreaterThanOrEqualTo(0).WithName("مقدار ضایعات");
        RuleFor(x => x).Must(x => x.Quantity + x.ScrapQuantity > 0)
            .WithMessage("مقدار محصول یا ضایعات باید بیشتر از صفر باشد.");
    }
}

public class ProductionExecutionHandler :
    IRequestHandler<IssueProductionMaterialsCommand, long>,
    IRequestHandler<ReceiveProductionOutputCommand, long>,
    IRequestHandler<CompleteProductionOrderCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly ISender _sender;
    private readonly IInventoryReferenceReader _inventory;

    public ProductionExecutionHandler(IApplicationDbContext context, ISender sender, IInventoryReferenceReader inventory)
    {
        _context = context;
        _sender = sender;
        _inventory = inventory;
    }

    public async Task<long> Handle(IssueProductionMaterialsCommand request, CancellationToken cancellationToken)
    {
        var order = await LoadRunnable(request.Id, cancellationToken);
        await EnsureDocTypeAsync(request.DocTypeId, InventoryNature.Output, cancellationToken);

        var materials = await _context.ProductionOrderMaterials
            .AsNoTracking()
            .Where(m => m.ProductionOrderId == order.Id)
            .ToDictionaryAsync(m => m.Id, cancellationToken);
        if (request.Lines.Any(l => !materials.ContainsKey(l.MaterialId)))
            throw new BusinessRuleException("ماده اولیه انتخاب‌شده متعلق به این سفارش تولید نیست.");

        return await CreateDocAsync(order, new CreateInventoryDocCommand
        {
            DocTypeId = request.DocTypeId,
            WarehouseId = request.WarehouseId,
            DocDate = request.DocDate,
            Description = $"حواله مواد سفارش تولید {order.OrderNumber}",
            Details = request.Lines.Select(l => new CreateInventoryDocDetailDto
            {
                ProductId = materials[l.MaterialId].ProductId,
                MainUnitQuantity = l.Quantity,
                LocationId = request.LocationId,
                ReferenceEntityName = ProductionProgress.MaterialRole,
                ReferenceEntityLineId = l.MaterialId
            }).ToList()
        }, cancellationToken);
    }

    public async Task<long> Handle(ReceiveProductionOutputCommand request, CancellationToken cancellationToken)
    {
        var order = await LoadRunnable(request.Id, cancellationToken);
        await EnsureDocTypeAsync(request.DocTypeId, InventoryNature.Input, cancellationToken);

        var details = new List<CreateInventoryDocDetailDto>();
        if (request.Quantity > 0)
            details.Add(new CreateInventoryDocDetailDto
            {
                ProductId = order.ProductId,
                MainUnitQuantity = request.Quantity,
                LocationId = request.LocationId,
                ReferenceEntityName = ProductionProgress.OutputRole
            });
        if (request.ScrapQuantity > 0)
            details.Add(new CreateInventoryDocDetailDto
            {
                ProductId = order.ProductId,
                MainUnitQuantity = request.ScrapQuantity,
                LocationId = request.ScrapLocationId ?? request.LocationId,
                ReferenceEntityName = ProductionProgress.ScrapRole,
                Description = "ضایعات تولید"
            });

        return await CreateDocAsync(order, new CreateInventoryDocCommand
        {
            DocTypeId = request.DocTypeId,
            WarehouseId = request.WarehouseId,
            DocDate = request.DocDate,
            Description = $"رسید محصول سفارش تولید {order.OrderNumber}",
            Details = details
        }, cancellationToken);
    }

    public async Task<bool> Handle(CompleteProductionOrderCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.ProductionOrders.FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("سفارش تولید یافت نشد.");
        if (order.Status != ProductionOrderStatus.InProgress)
            throw new BusinessRuleException("فقط سفارش در حال تولید قابل تکمیل است.");

        var lines = await _inventory.GetLinesAsync(ProductionProgress.ReferenceName, order.Id, cancellationToken);
        var progress = ProductionProgress.Compute(order.ProductId, lines);
        if (progress.HasOpenDocs)
            throw new BusinessRuleException("سند انبار قطعی‌نشده‌ای برای این سفارش وجود دارد؛ پیش از تکمیل، آن را قطعی یا باطل کنید.");
        if (progress.Output.Done <= 0)
            throw new BusinessRuleException("هنوز محصولی برای این سفارش دریافت (قطعی) نشده است.");

        order.Status = ProductionOrderStatus.Completed;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<ProductionOrder> LoadRunnable(int id, CancellationToken ct)
    {
        var order = await _context.ProductionOrders.FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new KeyNotFoundException("سفارش تولید یافت نشد.");
        if (order.Status is not (ProductionOrderStatus.Released or ProductionOrderStatus.InProgress))
            throw new BusinessRuleException(order.Status == ProductionOrderStatus.Draft
                ? "سفارش تولید هنوز تأیید نشده است؛ پیش از حواله مواد یا رسید محصول آن را تأیید کنید."
                : "برای سفارش تکمیل‌شده یا ابطال‌شده سند انبار جدید صادر نمی‌شود.");
        return order;
    }

    private async Task EnsureDocTypeAsync(int docTypeId, InventoryNature nature, CancellationToken ct)
    {
        if (!await _context.InventoryDocTypes.AnyAsync(t => t.Id == docTypeId && t.Nature == nature, ct))
            throw new BusinessRuleException(nature == InventoryNature.Output
                ? "نوع سند حواله مواد باید از نوع صادره (حواله) باشد."
                : "نوع سند رسید محصول باید از نوع وارده (رسید) باشد.");
    }

    // ساخت سند و شروع تولید با هم انجام می‌شوند یا هیچ‌کدام
    private async Task<long> CreateDocAsync(ProductionOrder order, CreateInventoryDocCommand doc, CancellationToken ct)
    {
        doc.ReferenceEntityName = ProductionProgress.ReferenceName;
        doc.ReferenceEntityId = order.Id;
        doc.ReferenceExternalCode = order.OrderNumber;

        await using var transaction = await _context.Database.BeginTransactionAsync(ct);
        var docId = await _sender.Send(doc, ct);
        order.Status = ProductionOrderStatus.InProgress;
        await _context.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return docId;
    }
}
