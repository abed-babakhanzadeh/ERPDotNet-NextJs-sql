using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.ProductEngineering.Commands.DeleteBOM;

[CacheInvalidation("BOMs")] 
public record DeleteBOMCommand : IRequest<int>
{
    public int Id { get; set; }
    public byte[]? RowVersion { get; set; } // <--- اضافه شد
}

public class DeleteBOMHandler : IRequestHandler<DeleteBOMCommand, int>
{
    private readonly IApplicationDbContext _context;

    public DeleteBOMHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(DeleteBOMCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.BOMHeaders
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (entity == null)
        {
            throw new KeyNotFoundException($"فرمول با شناسه {request.Id} یافت نشد.");
        }

        // === کنترل همروندی ===
        if (request.RowVersion != null && request.RowVersion.Length > 0)
        {
            _context.Entry(entity).Property(x => x.RowVersion).OriginalValue = request.RowVersion;
        }

        entity.IsActive = false;
        entity.Status = Domain.Modules.ProductEngineering.Entities.BOMStatus.Obsolete;
        entity.IsDeleted = true;

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
             throw new Exception("این رکورد همزمان توسط کاربر دیگری تغییر یافته است.");
        }
        
        return entity.Id;
    }
}