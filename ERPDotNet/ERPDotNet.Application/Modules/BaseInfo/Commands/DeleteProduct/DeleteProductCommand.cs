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

        // Soft Delete
        entity.IsDeleted = true;
        
        // چون از Interceptor استفاده می‌کنیم، LastModified و کاربر ویرایش کننده خودکار پر می‌شود
        
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}