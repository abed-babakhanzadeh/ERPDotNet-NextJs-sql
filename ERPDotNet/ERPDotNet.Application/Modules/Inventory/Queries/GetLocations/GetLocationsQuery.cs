using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Queries.GetLocations;

// کش کردن لیست لوکیشن‌ها برای پرفورمنس بالا (تگ Locations برای ابطال هوشمند)
[Cached(timeToLiveSeconds: 600, "Locations")]
public record GetLocationsQuery(int WarehouseId) : IRequest<List<LocationDto>>;

public class GetLocationsQueryHandler : IRequestHandler<GetLocationsQuery, List<LocationDto>>
{
    private readonly IApplicationDbContext _context;

    public GetLocationsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<LocationDto>> Handle(GetLocationsQuery request, CancellationToken cancellationToken)
    {
        // Tier-0 Strategy:
        // بجای بارگذاری ساختار درختی (که کند است)، لیست فلت را بر اساس Path مرتب می‌کنیم.
        // مرتب‌سازی بر اساس Path باعث می‌شود فرزندان دقیقاً زیر پدرشان قرار بگیرند.
        
        return await _context.Locations
            .AsNoTracking()
            .Where(x => x.WarehouseId == request.WarehouseId && !x.IsDeleted) // شرط حذف منطقی
            .OrderBy(x => x.Path) // کلید طلایی برای ساختار درختی سریع
            .Select(x => new LocationDto
            {
                Id = x.Id,
                Title = x.Title!,
                Code = x.Code,
                ParentId = x.ParentId,
                Path = x.Path,
                IsBlocked = x.IsBlocked,
                // محاسبه سطح (Level) در دیتابیس با شمردن کاراکترهای جداکننده
                Level = x.Path.Length - x.Path.Replace("/", "").Length,
                RowVersion = Convert.ToBase64String(x.RowVersion!)
            })
            .ToListAsync(cancellationToken);
    }
}