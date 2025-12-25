using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.DeleteProduct;

[CacheInvalidation("Products")]
public record DeleteProductCommand(int Id) : IRequest<bool>;

public class DeleteProductHandler : IRequestHandler<DeleteProductCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteProductHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteProductCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken);

        if (entity == null) return false;

        // === اعتبارسنجی وابستگی‌ها (Dependency Check) ===

        // 1. آیا این کالا به عنوان "مواد اولیه" در فرمول ساخت (BOM) کالای دیگری استفاده شده؟
        var isUsedInBOMs = await _context.BOMDetails
            .AnyAsync(d => d.ChildProductId == request.Id && !d.BOMHeader.IsDeleted, cancellationToken);

        if (isUsedInBOMs)
        {
            throw new Exception("این کالا در فرمول ساخت (BOM) سایر محصولات استفاده شده است و قابل حذف نیست.");
        }

        // 2. آیا این کالا خودش دارای فرمول ساخت فعال است؟
        var hasBOM = await _context.BOMHeaders
            .AnyAsync(h => h.ProductId == request.Id && !h.IsDeleted, cancellationToken);

        if (hasBOM)
        {
            throw new Exception("برای این کالا فرمول ساخت (BOM) تعریف شده است. ابتدا باید BOM آن را حذف کنید.");
        }

        // 3. (اختیاری) چک کردن در سفارشات خرید/فروش اگر ماژولش را دارید
        // ...

        // انجام عملیات حذف (Soft Delete)
        entity.IsDeleted = true;
        
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
