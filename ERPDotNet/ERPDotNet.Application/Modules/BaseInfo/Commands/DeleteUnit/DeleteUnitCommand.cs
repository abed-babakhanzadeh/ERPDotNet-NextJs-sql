using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.DeleteUnit;

[CacheInvalidation("Units", "UnitsLookup")]
public record DeleteUnitCommand(int Id) : IRequest<bool>;

public class DeleteUnitHandler : IRequestHandler<DeleteUnitCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteUnitHandler(IApplicationDbContext context)
    {
        _context = context;
    }

public async Task<bool> Handle(DeleteUnitCommand request, CancellationToken cancellationToken)
{
    var entity = await _context.Units
        .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

    if (entity == null) return false;

    // === اعتبارسنجی تجاری (Business Logic) ===
    
    // 1. آیا در کالاها استفاده شده؟
    var isUsedInProducts = await _context.Products
        .AnyAsync(p => p.UnitId == request.Id && !p.IsDeleted, cancellationToken);
        
    if (isUsedInProducts)
    {
        // پرتاب خطای مشخص برای نمایش به کاربر
        throw new Exception("این واحد سنجش در تعریف کالاها استفاده شده است و قابل حذف نیست.");
    }

    // 2. آیا به عنوان واحد تبدیل (Conversions) استفاده شده؟
    var isUsedInConversions = await _context.ProductUnitConversions
        .AnyAsync(c => c.AlternativeUnitId == request.Id, cancellationToken);

    if (isUsedInConversions)
    {
        throw new Exception("این واحد در جدول تبدیل واحد کالاها استفاده شده است.");
    }

    // 3. آیا واحد پدر واحدهای دیگر است؟
    var hasChildUnits = await _context.Units
        .AnyAsync(u => u.BaseUnitId == request.Id && !u.IsDeleted, cancellationToken);
        
    if (hasChildUnits)
    {
        throw new Exception("این واحد، واحدِ پایه برای واحدهای دیگر است. ابتدا وابستگی‌ها را حذف کنید.");
    }

    // انجام حذف (Soft Delete)
    entity.IsDeleted = true;
    entity.LastModifiedAt = DateTime.UtcNow;

    await _context.SaveChangesAsync(cancellationToken);
    return true;
}
}