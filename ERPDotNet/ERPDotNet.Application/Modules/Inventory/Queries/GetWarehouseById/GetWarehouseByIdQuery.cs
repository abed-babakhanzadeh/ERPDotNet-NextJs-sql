using ERPDotNet.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ERPDotNet.Application.Modules.Inventory.Services;

namespace ERPDotNet.Application.Modules.Inventory.Queries.GetWarehouseById;

public record GetWarehouseByIdQuery(int Id) : IRequest<WarehouseDetailsDto>, IWarehouseScopedRequest
{
    IEnumerable<int> IWarehouseScopedRequest.ScopedWarehouseIds => [Id];
}

public record WarehouseDetailsDto(
    int Id,
    string Title,
    string Code,
    int Type,
    string? Address,
    int? CompanyId,
    bool IsActive,
    string RowVersion // ارسال به صورت Base64 برای فرانت
);

public class GetWarehouseByIdHandler : IRequestHandler<GetWarehouseByIdQuery, WarehouseDetailsDto>
{
    private readonly IApplicationDbContext _context;

    public GetWarehouseByIdHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<WarehouseDetailsDto> Handle(GetWarehouseByIdQuery request, CancellationToken cancellationToken)
    {
        var result = await _context.Warehouses
            .AsNoTracking()
            .Where(x => x.Id == request.Id && !x.IsDeleted)
            .Select(x => new WarehouseDetailsDto(
                x.Id,
                x.Title,
                x.Code,
                (int)x.Type,
                x.Address,
                x.CompanyId,
                x.IsActive,
                x.RowVersion != null ? Convert.ToBase64String(x.RowVersion) : ""
            ))
            .FirstOrDefaultAsync(cancellationToken);

        if (result == null) throw new KeyNotFoundException("انبار یافت نشد.");
        
        return result;
    }
}