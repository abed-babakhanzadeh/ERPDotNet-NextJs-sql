using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.Inventory.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Queries.GetWarehouses;

// اضافه کردن کش با زمان 10 دقیقه و تگ انبارها
[Cached(timeToLiveSeconds: 600, "Warehouses")]
public record GetWarehousesQuery : PaginatedRequest, IRequest<PaginatedResult<WarehouseDto>>;

public class GetWarehousesHandler : IRequestHandler<GetWarehousesQuery, PaginatedResult<WarehouseDto>>
{
    private readonly IApplicationDbContext _context;

    public GetWarehousesHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<WarehouseDto>> Handle(GetWarehousesQuery request, CancellationToken cancellationToken)
    {
    // حذف AsNoTracking از ابتدای زنجیره برای اطمینان از اعمال Global Filter
    // در پروژه‌های Tier-0، بهتر است AsNoTracking را بعد از فیلترهای پایه اعمال کنید
    var query = _context.Warehouses.AsQueryable(); 

    // اعمال فیلترهای داینامیک و جستجو
    query = query.ApplyDynamicFilters(request.Filters); 

    if (!string.IsNullOrWhiteSpace(request.SearchTerm))
    {
        var search = request.SearchTerm.Trim().ToLower();
        query = query.Where(x => x.Title.ToLower().Contains(search) || x.Code.ToLower().Contains(search)); 
    }

    // مرتب‌سازی
    var sortColumn = request.SortColumn ?? "Code";
    query = query.OrderByNatural(sortColumn, request.SortDescending);

    // حالا در مرحله پروجکشن، AsNoTracking و Select را انجام دهید
    return await query
        .AsNoTracking() // انتقال به انتهای کوئری قبل از Select
        .Select(x => new WarehouseDto
        {
            Id = x.Id,
            Title = x.Title,
            Code = x.Code,
            Address = x.Address,
            Type = x.Type.ToDisplay(),
            IsActive = x.IsActive,
            CreatedAt = x.CreatedAt,
            CreatedBy = x.CreatedBy,
            RowVersion = x.RowVersion
        })
        .ToPaginatedListAsync(request.PageNumber, request.PageSize, cancellationToken);
    }
}