using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.DeleteProductAttribute;

public record DeleteProductAttributeCommand(int Id) : IRequest<bool>;

public class DeleteProductAttributeHandler : IRequestHandler<DeleteProductAttributeCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteProductAttributeHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteProductAttributeCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.ProductAttributes.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("ویژگی کالا یافت نشد.");

        if (await _context.ProductVariantValues.AnyAsync(x => x.AttributeValue!.AttributeId == request.Id, cancellationToken))
            throw new BusinessRuleException("این ویژگی در تنوع کالا استفاده شده و قابل حذف نیست.");

        entity.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
