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

        if (entity == null)
        {
            return false;
        }

        // === Business Validation Check ===
        // چک کنیم که آیا این واحد در جایی استفاده شده؟
        // var isUsedInProducts = await _context.Products.AnyAsync(p => p.UnitId == request.Id);
        // if (isUsedInProducts) throw new Exception("این واحد در تعریف کالاها استفاده شده و قابل حذف نیست.");
        // فعلاً برای سادگی فقط Soft Delete می‌کنیم
        
        entity.IsDeleted = true;
        entity.LastModifiedAt = DateTime.UtcNow;

        // آپدیت
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}