using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.DeleteProductCategory;

public record DeleteProductCategoryCommand(int Id) : IRequest<bool>;

public class DeleteProductCategoryHandler : IRequestHandler<DeleteProductCategoryCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteProductCategoryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteProductCategoryCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.ProductCategories.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("گروه کالا یافت نشد.");

        if (await _context.ProductCategories.AnyAsync(x => x.ParentId == request.Id, cancellationToken))
            throw new BusinessRuleException("این گروه کالا زیرمجموعه دارد و قابل حذف نیست.");

        if (await _context.Products.AnyAsync(p => p.CategoryId == request.Id, cancellationToken))
            throw new BusinessRuleException("این گروه کالا به کالا تخصیص داده شده و قابل حذف نیست.");

        entity.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
