using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.Contracts;
using ERPDotNet.Application.Modules.Production.Services;
using ERPDotNet.Domain.Modules.Production.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Production.Commands.ChangeProductionOrderStatus;

/// <summary>تأیید سفارش پیش‌نویس؛ از این به بعد نیاز مواد ثابت است و برای حواله مواد آماده می‌شود</summary>
public record ReleaseProductionOrderCommand(int Id) : IRequest<bool>;

/// <summary>ابطال سفارشی که هیچ سند انبار زنده‌ای (قطعی یا در جریان) ندارد</summary>
public record CancelProductionOrderCommand(int Id) : IRequest<bool>;

public class ChangeProductionOrderStatusHandler :
    IRequestHandler<ReleaseProductionOrderCommand, bool>,
    IRequestHandler<CancelProductionOrderCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IInventoryReferenceReader _inventory;

    public ChangeProductionOrderStatusHandler(IApplicationDbContext context, IInventoryReferenceReader inventory)
    {
        _context = context;
        _inventory = inventory;
    }

    public async Task<bool> Handle(ReleaseProductionOrderCommand request, CancellationToken cancellationToken)
    {
        var order = await Load(request.Id, cancellationToken);
        if (order.Status != ProductionOrderStatus.Draft)
            throw new BusinessRuleException("فقط سفارش پیش‌نویس قابل تأیید است.");
        if (!await _context.ProductionOrderMaterials.AnyAsync(m => m.ProductionOrderId == order.Id, cancellationToken))
            throw new BusinessRuleException("سفارش بدون ماده اولیه قابل تأیید نیست؛ فرمول آن را بررسی کنید.");

        order.Status = ProductionOrderStatus.Released;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> Handle(CancelProductionOrderCommand request, CancellationToken cancellationToken)
    {
        var order = await Load(request.Id, cancellationToken);
        if (order.Status is not (ProductionOrderStatus.Draft or ProductionOrderStatus.Released or ProductionOrderStatus.InProgress))
            throw new BusinessRuleException("سفارش تکمیل‌شده یا ابطال‌شده قابل ابطال نیست.");

        // سفارش در حال تولید فقط وقتی ابطال می‌شود که همه اسناد انبارش رد یا باطل شده باشند
        var lines = await _inventory.GetLinesAsync(ProductionProgress.ReferenceName, order.Id, cancellationToken);
        if (lines.Any(l => !ProductionProgress.IsVoid(l.Status)))
            throw new BusinessRuleException("این سفارش سند انبار قطعی یا در جریان دارد؛ ابتدا آن اسناد را باطل کنید.");

        order.Status = ProductionOrderStatus.Cancelled;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<ProductionOrder> Load(int id, CancellationToken ct) =>
        await _context.ProductionOrders.FirstOrDefaultAsync(o => o.Id == id, ct)
        ?? throw new KeyNotFoundException("سفارش تولید یافت نشد.");
}
