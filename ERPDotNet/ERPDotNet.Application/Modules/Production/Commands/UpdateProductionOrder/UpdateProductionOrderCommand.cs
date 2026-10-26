using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Production.Commands.CreateProductionOrder;
using ERPDotNet.Application.Modules.Production.Services;
using ERPDotNet.Domain.Modules.Production.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Production.Commands.UpdateProductionOrder;

/// <summary>ویرایش سفارش پیش‌نویس؛ نیاز مواد دوباره از فرمول محاسبه می‌شود</summary>
public record UpdateProductionOrderCommand : IRequest<bool>
{
    public int Id { get; set; }
    public int? BOMHeaderId { get; set; }
    public decimal Quantity { get; set; }
    public DateTime? PlannedStartDate { get; set; }
    public DateTime? PlannedEndDate { get; set; }
    public string? Description { get; set; }
    public byte[]? RowVersion { get; set; }
}

public class UpdateProductionOrderValidator : AbstractValidator<UpdateProductionOrderCommand>
{
    public UpdateProductionOrderValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("مقدار تولید باید بیشتر از صفر باشد.");
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x).Must(x => ProductionOrderRules.DatesInOrder(x.PlannedStartDate, x.PlannedEndDate))
            .WithName("PlannedEndDate").WithMessage(ProductionOrderRules.DatesMessage);
    }
}

public class UpdateProductionOrderHandler : IRequestHandler<UpdateProductionOrderCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateProductionOrderHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateProductionOrderCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.ProductionOrders
            .Include(o => o.Materials)
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("سفارش تولید یافت نشد.");
        if (order.Status != ProductionOrderStatus.Draft)
            throw new BusinessRuleException("فقط سفارش پیش‌نویس قابل ویرایش است.");

        var bom = await ProductionRequirements.ResolveBomAsync(
            _context, order.ProductId, request.BOMHeaderId, DateTime.UtcNow, cancellationToken);

        if (request.RowVersion is { Length: > 0 })
            _context.Entry(order).Property(x => x.RowVersion).OriginalValue = request.RowVersion;

        order.BOMHeaderId = bom.Id;
        order.Quantity = request.Quantity;
        order.PlannedStartDate = request.PlannedStartDate;
        order.PlannedEndDate = request.PlannedEndDate;
        order.Description = request.Description?.Trim();
        order.Materials.Clear();
        foreach (var material in ProductionRequirements.Explode(bom, request.Quantity))
            order.Materials.Add(material);

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
}
