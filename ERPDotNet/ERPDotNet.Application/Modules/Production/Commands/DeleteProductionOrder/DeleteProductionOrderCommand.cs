using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Production.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Production.Commands.DeleteProductionOrder;

public record DeleteProductionOrderCommand(int Id) : IRequest<bool>;

public class DeleteProductionOrderHandler : IRequestHandler<DeleteProductionOrderCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteProductionOrderHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteProductionOrderCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.ProductionOrders.FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("سفارش تولید یافت نشد.");
        if (order.Status != ProductionOrderStatus.Draft)
            throw new BusinessRuleException("فقط سفارش پیش‌نویس قابل حذف است؛ سفارش تأییدشده را ابطال کنید.");

        order.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
