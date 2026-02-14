using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Exceptions; // فرض بر این است که BusinessRuleException اینجا تعریف شده
using ERPDotNet.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.DeleteLocation;

[CacheInvalidation("Locations", "Warehouses")]
public record DeleteLocationCommand(int Id, string RowVersion) : IRequest<int>;

public class DeleteLocationHandler : IRequestHandler<DeleteLocationCommand, int>
{
    private readonly IApplicationDbContext _context;

    public DeleteLocationHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(DeleteLocationCommand request, CancellationToken cancellationToken)
    {
        // 1. دریافت لوکیشن همراه با فرزندان (برای چک کردن زیرمجموعه)
        var entity = await _context.Locations
            .Include(x => x.Children)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        // رفع خطای NotFoundException: طبق الگوی شما اکسپشن معمولی پرتاب می‌کنیم
        if (entity == null)
            throw new Exception("لوکیشن مورد نظر یافت نشد.");

        // 2. اعمال کنترل همروندی (Optimistic Concurrency)
        if (!string.IsNullOrEmpty(request.RowVersion))
        {
            var rowVersionBytes = Convert.FromBase64String(request.RowVersion);
            _context.Entry(entity).Property(x => x.RowVersion).OriginalValue = rowVersionBytes;
        }

        // 3. چک کردن فرزندان (فقط فرزندان فعال مانع حذف هستند)
        if (entity.Children.Any(x => !x.IsDeleted))
            throw new BusinessRuleException("این لوکیشن دارای زیرمجموعه فعال است و قابل حذف نیست.");

        // 4. چک کردن موجودی کالا
        // رفع خطای Quantity: نام فیلد در CurrentStock.cs شما QuantityOnHand است
        var hasStock = await _context.CurrentStocks
            .AnyAsync(x => x.LocationId == request.Id && x.QuantityOnHand > 0, cancellationToken);

        if (hasStock)
            throw new BusinessRuleException("این لوکیشن دارای موجودی کالا است و قابل حذف نیست.");

        // 5. چک کردن گردش تراکنش
        var hasTransactions = await _context.InventoryTransactions
            .AnyAsync(x => x.LocationId == request.Id, cancellationToken);
        
        if (hasTransactions)
            throw new BusinessRuleException("برای این لوکیشن گردش انبار ثبت شده است.");

        // 6. حذف منطقی (Soft Delete)
        entity.IsDeleted = true;

        await _context.SaveChangesAsync(cancellationToken);
        
        return request.Id;
    }
}