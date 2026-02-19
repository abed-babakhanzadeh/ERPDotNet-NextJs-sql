using ERPDotNet.Application.Common.Constants;
using ERPDotNet.Application.Common.Extensions; 
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.Inventory.DTOs;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Queries.GetCurrentStock;

public record GetCurrentStockQuery : IRequest<PaginatedResult<InventoryStockDto>>
{
    public int? WarehouseId { get; set; }
    public int? ProductId { get; set; }
    
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string SortColumn { get; set; } = "Id"; 
    public bool SortDescending { get; set; } = true;
    public List<FilterModel>? Filters { get; set; }
    public string? SearchTerm { get; set; } 
    
    public bool ExcludeZeroBalances { get; set; } = true; 
}

public class GetCurrentStockValidator : AbstractValidator<GetCurrentStockQuery>
{
    public GetCurrentStockValidator()
    {
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
        var isSingleProductRequest = request.WarehouseId.HasValue && request.ProductId.HasValue;
        
        // === 1. بررسی کش (Caching) ===
        if (isSingleProductRequest)
        {
            var cacheKey = CacheKeys.CurrentStock(request.WarehouseId!.Value, request.ProductId!.Value);
            var cachedData = await _cacheService.GetAsync<List<InventoryStockDto>>(cacheKey, cancellationToken);
            if (cachedData != null)
            {
                return new PaginatedResult<InventoryStockDto>(cachedData, cachedData.Count, 1, cachedData.Count);
            }
        }

        // === 2. کوئری پایه ===
        var query = _context.CurrentStocks
            .AsNoTracking()
            // ✨ رفع هشدار CS8602 با استفاده از عملگر !
            .Include(x => x.Product).ThenInclude(p => p!.Unit) 
            .Include(x => x.Warehouse)
            .Include(x => x.Location)
            .Include(x => x.Batch)
            .AsQueryable();

        // فیلترهای پایه سیستم
        if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
            query = query.Where(x => x.WarehouseId == request.WarehouseId.Value);

        if (request.ProductId.HasValue)
            query = query.Where(x => x.ProductId == request.ProductId.Value);

        if (request.ExcludeZeroBalances)
            query = query.Where(x => x.QuantityOnHand != 0 || x.QuantityReserved != 0);

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim();
            query = query.Where(x => 
                (x.Product != null && x.Product.Name.Contains(term)) ||
                (x.Product != null && x.Product.Code.Contains(term)) ||
                (x.Batch != null && x.Batch.BatchNumber.Contains(term)) ||
                (x.Location != null && x.Location.Code.Contains(term)) ||
                (x.Warehouse != null && x.Warehouse.Title.Contains(term))
            );
        }

        // === 3. فیلترهای داینامیک پیشرفته (گرید) ===
        if (request.Filters != null && request.Filters.Any())
        {
            var validFilters = new List<FilterModel>();
            foreach (var filter in request.Filters)
            {
                var lowerProp = filter.PropertyName?.ToLower();
                
                // هندل کردن دستی فیلتر ستون محاسباتی (موجودی در دسترس)
                if (lowerProp == "availablequantity" && !string.IsNullOrEmpty(filter.Value))
                {
                    var engVal = filter.Value.Replace("۰", "0").Replace("۱", "1").Replace("۲", "2").Replace("۳", "3").Replace("۴", "4")
                                             .Replace("۵", "5").Replace("۶", "6").Replace("۷", "7").Replace("۸", "8").Replace("۹", "9");
                    
                    if (decimal.TryParse(engVal, out decimal val))
                    {
                        var op = filter.Operation?.ToLower() ?? "eq";
                        
                        if (op == "eq" || op == "equals" || op == "=") 
                            query = query.Where(x => (x.QuantityOnHand - x.QuantityReserved) == val);
                        else if (op == "neq" || op == "notequals" || op == "!=") 
                            query = query.Where(x => (x.QuantityOnHand - x.QuantityReserved) != val);
                        else if (op == "gt" || op == "greaterthan" || op == ">") 
                            query = query.Where(x => (x.QuantityOnHand - x.QuantityReserved) > val);
                        else if (op == "gte" || op == "greaterthanorequal" || op == ">=") 
                            query = query.Where(x => (x.QuantityOnHand - x.QuantityReserved) >= val);
                        else if (op == "lt" || op == "lessthan" || op == "<") 
                            query = query.Where(x => (x.QuantityOnHand - x.QuantityReserved) < val);
                        else if (op == "lte" || op == "lessthanorequal" || op == "<=") 
                            query = query.Where(x => (x.QuantityOnHand - x.QuantityReserved) <= val);
                    }
                    continue;
                }

                // مپ کردن نام ستون‌های ارسالی از فرانت به نام‌های تو در تو دیتابیس
                var mappedName = MapColumn(filter.PropertyName);
                if (!string.IsNullOrEmpty(mappedName))
                {
                    filter.PropertyName = mappedName;
                    validFilters.Add(filter);
                }
            }
            
            if (validFilters.Any())
            {
                query = query.ApplyDynamicFilters(validFilters);
            }
        }

        // === 4. پروجکشن (Select) به DTO ===
        var dtoQuery = query.Select(s => new InventoryStockDto
        {
            Id = s.Id,
            WarehouseTitle = s.Warehouse != null ? s.Warehouse.Title : "", 
            ProductId = s.ProductId,
            ProductName = s.Product != null ? s.Product.Name : "", 
            ProductCode = s.Product != null ? s.Product.Code : "",
            UnitTitle = s.Product != null && s.Product.Unit != null ? s.Product.Unit.Title : "",
            QuantityOnHand = s.QuantityOnHand,
            QuantityReserved = s.QuantityReserved,
            QuantityBlocked = 0, 
            AvailableQuantity = s.QuantityOnHand - s.QuantityReserved - 0, 
            LocationCode = s.Location != null ? s.Location.Code : "",
            BatchNumber = s.Batch != null ? s.Batch.BatchNumber : ""
        });

        // === 5. سورتینگ و پیجینیشن ===
        var sortColumn = MapSortColumn(request.SortColumn);
        dtoQuery = !string.IsNullOrEmpty(sortColumn) 
            ? dtoQuery.OrderByNatural(sortColumn, request.SortDescending) 
            : dtoQuery.OrderByDescending(x => x.Id);

        var result = await dtoQuery.ToPaginatedListAsync(request.PageNumber, request.PageSize, cancellationToken);
        
        // ذخیره نتیجه در کش
        if (isSingleProductRequest && result.Items.Any())
        {
            var cacheKey = CacheKeys.CurrentStock(request.WarehouseId!.Value, request.ProductId!.Value);
            await _cacheService.SetAsync(cacheKey, result.Items, TimeSpan.FromMinutes(5), null, cancellationToken);
        }

        return result;
    }

    // ✨ رفع هشدار CS8604: نوع ورودی به string? تغییر کرد
    private string MapColumn(string? column)
    {
        if (string.IsNullOrWhiteSpace(column)) return "";
        var lower = column.ToLower();
        
        return lower switch
        {
            "id" => "Id",
            "warehousetitle" => "Warehouse.Title",
            "warehouseid" => "WarehouseId",
            "productcode" => "Product.Code",
            "productname" => "Product.Name",
            "productid" => "ProductId",
            "unittitle" => "Product.Unit.Title",
            "batchnumber" => "Batch.BatchNumber",
            "batchid" => "BatchId",
            "locationcode" => "Location.Code",
            "locationid" => "LocationId",
            "quantityonhand" => "QuantityOnHand",
            "quantityreserved" => "QuantityReserved",
            "availablequantity" => "AvailableQuantity",
            _ => char.ToUpperInvariant(column[0]) + column.Substring(1) 
        };
    }

    // نوع ورودی به string? تغییر کرد تا در صورت نال بودن، کرش نکند
    private string MapSortColumn(string? column)
    {
        if (string.IsNullOrWhiteSpace(column)) return "Id";
        var lower = column.ToLower();

        return lower switch
        {
            "warehousetitle" => "WarehouseTitle",
            "productcode" => "ProductCode",
            "productname" => "ProductName",
            "unittitle" => "UnitTitle",
            "batchnumber" => "BatchNumber",
            "locationcode" => "LocationCode",
            "quantityonhand" => "QuantityOnHand",
            "quantityreserved" => "QuantityReserved",
            "availablequantity" => "AvailableQuantity",
            _ => "Id"
        };
    }
}