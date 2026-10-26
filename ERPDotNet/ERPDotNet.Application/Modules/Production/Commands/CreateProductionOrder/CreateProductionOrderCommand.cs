using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Production.Services;
using ERPDotNet.Domain.Modules.Production.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Production.Commands.CreateProductionOrder;

public record CreateProductionOrderCommand : IRequest<int>
{
    public int ProductId { get; set; }
    // خالی یعنی فرمول اصلی کالا
    public int? BOMHeaderId { get; set; }
    public decimal Quantity { get; set; }
    public DateTime? PlannedStartDate { get; set; }
    public DateTime? PlannedEndDate { get; set; }
    public string? Description { get; set; }
}

/// <summary>قواعد مشترک ثبت و ویرایش سفارش تولید</summary>
public static class ProductionOrderRules
{
    public const string DatesMessage = "تاریخ پایان برنامه نمی‌تواند قبل از تاریخ شروع باشد.";

    public static bool DatesInOrder(DateTime? start, DateTime? end) =>
        !start.HasValue || !end.HasValue || end.Value.Date >= start.Value.Date;
}

public class CreateProductionOrderValidator : AbstractValidator<CreateProductionOrderCommand>
{
    public CreateProductionOrderValidator(IApplicationDbContext context)
    {
        RuleFor(x => x.ProductId).GreaterThan(0)
            .MustAsync(async (id, ct) => await context.Products.AnyAsync(p => p.Id == id && p.IsActive, ct))
            .WithMessage("کالا یافت نشد یا غیرفعال است.");
        RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("مقدار تولید باید بیشتر از صفر باشد.");
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x).Must(x => ProductionOrderRules.DatesInOrder(x.PlannedStartDate, x.PlannedEndDate))
            .WithName("PlannedEndDate").WithMessage(ProductionOrderRules.DatesMessage);
    }
}

public class CreateProductionOrderHandler : IRequestHandler<CreateProductionOrderCommand, int>
{
    private readonly IApplicationDbContext _context;

    public CreateProductionOrderHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CreateProductionOrderCommand request, CancellationToken cancellationToken)
    {
        var bom = await ProductionRequirements.ResolveBomAsync(
            _context, request.ProductId, request.BOMHeaderId, DateTime.UtcNow, cancellationToken);

        var order = new ProductionOrder
        {
            ProductId = request.ProductId,
            BOMHeaderId = bom.Id,
            Quantity = request.Quantity,
            PlannedStartDate = request.PlannedStartDate,
            PlannedEndDate = request.PlannedEndDate,
            Description = request.Description?.Trim(),
            Materials = ProductionRequirements.Explode(bom, request.Quantity),
            Operations = ProductionRequirements.ExplodeOperations(bom, request.Quantity)
        };

        _context.ProductionOrders.Add(order);
        await _context.SaveChangesAsync(cancellationToken);

        // شماره از شناسه ساخته می‌شود تا یکتا و بدون رقابت باشد
        order.OrderNumber = $"MO-{order.Id:D5}";
        await _context.SaveChangesAsync(cancellationToken);
        return order.Id;
    }
}
