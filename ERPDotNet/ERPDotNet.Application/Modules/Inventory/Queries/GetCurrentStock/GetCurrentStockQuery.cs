using ERPDotNet.Application.Common.Constants;
using ERPDotNet.Application.Common.Extensions; // برای ApplyDynamicFilters و OrderByNatural و ToPaginatedListAsync
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.Inventory.DTOs;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Queries.GetCurrentStock;

public record GetCurrentStockQuery : IRequest<PaginatedResult<InventoryStockDto>>
{
    public int WarehouseId { get; set; }
    
    // فیلتر سریع (اگر از بیرون بیاید)
    public int? ProductId { get; set; }

    // پارامترهای استاندارد گرید
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string OrderBy { get; set; } = "Id";
    public bool IsDescending { get; set; } = true;

    // فیلترهای پیشرفته داینامیک از سمت فرانت
    public List<FilterModel>? AdvancedFilters { get; set; }
}

public class GetCurrentStockValidator : AbstractValidator<GetCurrentStockQuery>
{
    public GetCurrentStockValidator()
    {
        RuleFor(x => x.WarehouseId).GreaterThan(0).WithMessage("انتخاب انبار الزامی است.");
        RuleFor(x => x.PageNumber).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).GreaterThanOrEqualTo(1);
    }
}

public class GetCurrentStockHandler : IRequestHandler<GetCurrentStockQuery, PaginatedResult<InventoryStockDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;

    public GetCurrentStockHandler(IApplicationDbContext context, ICacheService cacheService)
    {
        _context = context;
        _cacheService = cacheService;
    }

    public async Task<PaginatedResult<InventoryStockDto>> Handle(GetCurrentStockQuery request, CancellationToken cancellationToken)
    {
        // === 1. استراتژی کش (تک کالا) ===
        bool isSingleProductRequest = request.ProductId.HasValue 
                                      && (request.AdvancedFilters == null || !request.AdvancedFilters.Any());

        if (isSingleProductRequest)
        {
            var cacheKey = CacheKeys.CurrentStock(request.WarehouseId, request.ProductId!.Value);
            
            // پارامتر چهارم (tags) اینجا وجود ندارد چون متد GetAsync معمولا تگ نمیگیرد
            var cachedList = await _cacheService.GetAsync<List<InventoryStockDto>>(cacheKey, cancellationToken);
            
            if (cachedList != null)
            {
                // پیجینیشن دستی روی دیتای کش شده
                var count = cachedList.Count;
                var items = cachedList
                    .Skip((request.PageNumber - 1) * request.PageSize)
                    .Take(request.PageSize)
                    .ToList();
                
                return new PaginatedResult<InventoryStockDto>(items, count, request.PageNumber, request.PageSize);
            }
        }

        // === 2. کوئری پایه ===
        var query = _context.CurrentStocks
            .AsNoTracking() // حیاتی برای سرعت گزارش
            .Where(x => x.WarehouseId == request.WarehouseId);

        if (request.ProductId.HasValue)
        {
            query = query.Where(x => x.ProductId == request.ProductId.Value);
        }

        // === 3. تبدیل به DTO ===
        var dtoQuery = query.Select(s => new InventoryStockDto
        {
            Id = s.Id,
            ProductId = s.ProductId,
            
            // مپینگ دقیق بر اساس Entityهای آپلود شده شما
            ProductName = s.Product != null ? s.Product.Name : "", 
            ProductCode = s.Product != null ? s.Product.Code : "",
            UnitTitle = s.Product != null && s.Product.Unit != null ? s.Product.Unit.Title : "",
            
            QuantityOnHand = s.QuantityOnHand,
            QuantityReserved = s.QuantityReserved,
            QuantityBlocked = 0, // فعلاً صفر (آماده برای QC)
            
            LocationCode = s.Location != null ? s.Location.Code : "",
            // LocationPath = s.Location != null ? s.Location.Path : "", // اگر Path را اضافه کردید آن‌کامنت کنید
            
            BatchNumber = s.Batch != null ? s.Batch.BatchNumber : ""
        });

        // === 4. امنیت فیلترها (Whitelist) ===
        if (request.AdvancedFilters != null && request.AdvancedFilters.Any())
        {
            var allowedFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                nameof(InventoryStockDto.ProductName),
                nameof(InventoryStockDto.ProductCode),
                nameof(InventoryStockDto.BatchNumber),
                nameof(InventoryStockDto.LocationCode),
                nameof(InventoryStockDto.QuantityOnHand),
                nameof(InventoryStockDto.AvailableQuantity)
            };

            // حذف فیلترهای غیرمجاز
            request.AdvancedFilters = request.AdvancedFilters
                .Where(f => allowedFields.Contains(f.PropertyName))
                .ToList();

            if (request.AdvancedFilters.Any())
            {
                // استفاده از اکستنشن متد شما [FilterExtensions.cs]
                dtoQuery = dtoQuery.ApplyDynamicFilters(request.AdvancedFilters);
            }
        }

        // === 5. سورت و پیجینیشن ===
        // استفاده از اکستنشن متد شما [QueryableExtensions.cs]
        dtoQuery = dtoQuery.OrderByNatural(request.OrderBy, request.IsDescending);

        // استفاده از اکستنشن متد شما [QueryableExtensions.cs]
        // طبق فایل PaginatedResult.cs متد CreateAsync سه پارامتر دارد + cancellationToken
        // پس اکستنشن متد هم همینطور است.
        var result = await dtoQuery.ToPaginatedListAsync(request.PageNumber, request.PageSize, cancellationToken);

        // === 6. آپدیت کش ===
        if (isSingleProductRequest && result.Items.Any())
        {
            var cacheKey = CacheKeys.CurrentStock(request.WarehouseId, request.ProductId!.Value);
            
            // اصلاح شده طبق فایل CachingBehavior.cs:
            // پارامتر چهارم (Tags) باید ارسال شود که اینجا null می‌فرستیم.
            await _cacheService.SetAsync(cacheKey, result.Items, TimeSpan.FromMinutes(5), null, cancellationToken);
        }

        return result;
    }
}