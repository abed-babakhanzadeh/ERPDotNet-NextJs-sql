using ERPDotNet.Application.Common.Extensions; 
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.Inventory.DTOs;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Queries.GetProductCardex;

public record GetProductCardexQuery : IRequest<PaginatedResult<ProductCardexDto>>
{
    public int? WarehouseId { get; set; }
    public int? ProductId { get; set; }
    
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }

    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 15;
    public string SortColumn { get; set; } = "TransactionDate"; 
    public bool SortDescending { get; set; } = true;
    public List<FilterModel>? Filters { get; set; }
    public string? SearchTerm { get; set; } 
}

public class GetProductCardexValidator : AbstractValidator<GetProductCardexQuery>
{
    public GetProductCardexValidator()
    {
        // در کاردکس تجمیعی، فقط انتخاب کالا الزامی است
    }
}

public class CardexJoinedRow
{
    public InventoryTransaction Transaction { get; set; } = null!;
    public Warehouse Warehouse { get; set; } = null!; // ✨ انبار اضافه شد
    public InventoryDocHeader Header { get; set; } = null!;
    public InventoryDocType DocType { get; set; } = null!;
    public InventoryBatch? Batch { get; set; }
    public Location? Location { get; set; }
}

public class GetProductCardexHandler : IRequestHandler<GetProductCardexQuery, PaginatedResult<ProductCardexDto>>
{
    private readonly IApplicationDbContext _context;

    public GetProductCardexHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<ProductCardexDto>> Handle(GetProductCardexQuery request, CancellationToken cancellationToken)
    {
        // ✨ فقط کالا الزامی است
        if (request.ProductId == null || request.ProductId <= 0)
            return new PaginatedResult<ProductCardexDto>(new List<ProductCardexDto>(), 0, request.PageNumber, request.PageSize);

        // 1. استخراج لجر پایه
        var baseLedger = _context.InventoryTransactions
            .AsNoTracking()
            .Where(x => x.ProductId == request.ProductId);

        // اعمال فیلتر انبار فقط اگر ارسال شده باشد
        if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
        {
            baseLedger = baseLedger.Where(x => x.WarehouseId == request.WarehouseId.Value);
        }

        // 2. کوئری نمایش
        var viewQuery = from t in baseLedger
                        join w in _context.Warehouses.AsNoTracking() on t.WarehouseId equals w.Id // ✨ جوین با انبار
                        join h in _context.InventoryDocHeaders.AsNoTracking() on t.DocHeaderId equals h.Id
                        join dt in _context.InventoryDocTypes.AsNoTracking() on t.DocTypeId equals dt.Id
                        join b in _context.InventoryBatches.AsNoTracking() on t.BatchId equals b.Id into bj
                        from b in bj.DefaultIfEmpty()
                        join l in _context.Locations.AsNoTracking() on t.LocationId equals l.Id into lj
                        from l in lj.DefaultIfEmpty()
                        select new CardexJoinedRow
                        {
                            Transaction = t,
                            Warehouse = w,
                            Header = h,
                            DocType = dt,
                            Batch = b,
                            Location = l
                        };

        if (request.FromDate.HasValue) viewQuery = viewQuery.Where(x => x.Transaction.TransactionDate >= request.FromDate.Value);
        if (request.ToDate.HasValue) viewQuery = viewQuery.Where(x => x.Transaction.TransactionDate <= request.ToDate.Value);

        // 3. اعمال فیلترهای داینامیک
        if (request.Filters != null && request.Filters.Any())
        {
            var validFilters = new List<FilterModel>();
            foreach (var f in request.Filters)
            {
                var lowerProp = f.PropertyName?.ToLower();
                var val = f.Value?.ToLower() ?? "";

                if (lowerProp == "transactiondate" && !string.IsNullOrEmpty(val))
                {
                    var engVal = ConvertPersianNumbers(val);
                    var parts = engVal.Split('/');
                    if (parts.Length == 3 && int.TryParse(parts[0], out int year) && year >= 1300)
                    {
                        try 
                        {
                            var pc = new System.Globalization.PersianCalendar();
                            var dt = pc.ToDateTime(year, int.Parse(parts[1]), int.Parse(parts[2]), 0, 0, 0, 0);
                            viewQuery = viewQuery.Where(x => x.Transaction.TransactionDate.Date == dt.Date);
                        } catch { }
                    }
                    continue;
                }

                if (lowerProp == "signtitle" && !string.IsNullOrEmpty(val))
                {
                    if (val.Contains("وارد") || val.Contains("in")) viewQuery = viewQuery.Where(x => x.Transaction.Sign == InventoryTransactionSign.Increase);
                    else if (val.Contains("صادر") || val.Contains("out")) viewQuery = viewQuery.Where(x => x.Transaction.Sign == InventoryTransactionSign.Decrease);
                    continue;
                }

                if (lowerProp == "inquantity" || lowerProp == "outquantity")
                {
                    if (!string.IsNullOrEmpty(val))
                    {
                        var engVal = ConvertPersianNumbers(val);
                        if (decimal.TryParse(engVal, out decimal qty))
                        {
                            var op = f.Operation?.ToLower() ?? "eq";
                            bool isIn = lowerProp == "inquantity";

                            if (isIn)
                            {
                                if (op == "eq" || op == "equals" || op == "=" || op == "contains") viewQuery = viewQuery.Where(x => (x.Transaction.Sign == InventoryTransactionSign.Increase ? x.Transaction.Quantity : 0) == qty);
                                else if (op == "gt" || op == "greaterthan" || op == ">") viewQuery = viewQuery.Where(x => (x.Transaction.Sign == InventoryTransactionSign.Increase ? x.Transaction.Quantity : 0) > qty);
                                else if (op == "lt" || op == "lessthan" || op == "<") viewQuery = viewQuery.Where(x => (x.Transaction.Sign == InventoryTransactionSign.Increase ? x.Transaction.Quantity : 0) < qty);
                                else if (op == "gte" || op == "greaterthanorequal" || op == ">=") viewQuery = viewQuery.Where(x => (x.Transaction.Sign == InventoryTransactionSign.Increase ? x.Transaction.Quantity : 0) >= qty);
                                else if (op == "lte" || op == "lessthanorequal" || op == "<=") viewQuery = viewQuery.Where(x => (x.Transaction.Sign == InventoryTransactionSign.Increase ? x.Transaction.Quantity : 0) <= qty);
                            }
                            else 
                            {
                                if (op == "eq" || op == "equals" || op == "=" || op == "contains") viewQuery = viewQuery.Where(x => (x.Transaction.Sign == InventoryTransactionSign.Decrease ? x.Transaction.Quantity : 0) == qty);
                                else if (op == "gt" || op == "greaterthan" || op == ">") viewQuery = viewQuery.Where(x => (x.Transaction.Sign == InventoryTransactionSign.Decrease ? x.Transaction.Quantity : 0) > qty);
                                else if (op == "lt" || op == "lessthan" || op == "<") viewQuery = viewQuery.Where(x => (x.Transaction.Sign == InventoryTransactionSign.Decrease ? x.Transaction.Quantity : 0) < qty);
                                else if (op == "gte" || op == "greaterthanorequal" || op == ">=") viewQuery = viewQuery.Where(x => (x.Transaction.Sign == InventoryTransactionSign.Decrease ? x.Transaction.Quantity : 0) >= qty);
                                else if (op == "lte" || op == "lessthanorequal" || op == "<=") viewQuery = viewQuery.Where(x => (x.Transaction.Sign == InventoryTransactionSign.Decrease ? x.Transaction.Quantity : 0) <= qty);
                            }
                        }
                    }
                    continue;
                }

                if (lowerProp == "runningbalance") continue;

                var mappedName = MapColumn(f.PropertyName);
                if (!string.IsNullOrEmpty(mappedName))
                {
                    f.PropertyName = mappedName;
                    validFilters.Add(f);
                }
            }
            if (validFilters.Any()) viewQuery = viewQuery.ApplyDynamicFilters(validFilters);
        }

        // 4. سورتینگ 
        var sortCol = request.SortColumn?.ToLower() ?? "";
        var isDesc = request.SortDescending;

        if (sortCol == "inquantity")
        {
            viewQuery = isDesc 
                ? viewQuery.OrderByDescending(x => x.Transaction.Sign == InventoryTransactionSign.Increase ? x.Transaction.Quantity : 0).ThenByDescending(x => x.Transaction.Id)
                : viewQuery.OrderBy(x => x.Transaction.Sign == InventoryTransactionSign.Increase ? x.Transaction.Quantity : 0).ThenBy(x => x.Transaction.Id);
        }
        else if (sortCol == "outquantity")
        {
            viewQuery = isDesc 
                ? viewQuery.OrderByDescending(x => x.Transaction.Sign == InventoryTransactionSign.Decrease ? x.Transaction.Quantity : 0).ThenByDescending(x => x.Transaction.Id)
                : viewQuery.OrderBy(x => x.Transaction.Sign == InventoryTransactionSign.Decrease ? x.Transaction.Quantity : 0).ThenBy(x => x.Transaction.Id);
        }
        else if (sortCol == "signtitle")
        {
            viewQuery = isDesc 
                ? viewQuery.OrderByDescending(x => x.Transaction.Sign).ThenByDescending(x => x.Transaction.Id)
                : viewQuery.OrderBy(x => x.Transaction.Sign).ThenBy(x => x.Transaction.Id);
        }
        else if (sortCol == "runningbalance")
        {
            viewQuery = isDesc 
                ? viewQuery.OrderByDescending(x => x.Transaction.TransactionDate).ThenByDescending(x => x.Transaction.Id)
                : viewQuery.OrderBy(x => x.Transaction.TransactionDate).ThenBy(x => x.Transaction.Id);
        }
        else
        {
            var mappedSort = MapColumn(request.SortColumn);
            if (!string.IsNullOrEmpty(mappedSort) && mappedSort != "Transaction.TransactionDate")
            {
                viewQuery = viewQuery.OrderByNatural(mappedSort, isDesc);
            }
            else
            {
                viewQuery = isDesc 
                    ? viewQuery.OrderByDescending(x => x.Transaction.TransactionDate).ThenByDescending(x => x.Transaction.Id)
                    : viewQuery.OrderBy(x => x.Transaction.TransactionDate).ThenBy(x => x.Transaction.Id);
            }
        }

        var totalCount = await viewQuery.CountAsync(cancellationToken);
        
        var pagedRows = await viewQuery
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = new List<ProductCardexDto>();
        if (!pagedRows.Any())
            return new PaginatedResult<ProductCardexDto>(dtos, totalCount, request.PageNumber, request.PageSize);

        // 5. محاسبه موجودی 
        var oldestItemInPage = pagedRows.OrderBy(x => x.Transaction.TransactionDate).ThenBy(x => x.Transaction.Id).First().Transaction;

        var pastBalance = await baseLedger
            .Where(x => x.TransactionDate < oldestItemInPage.TransactionDate || 
                       (x.TransactionDate == oldestItemInPage.TransactionDate && x.Id < oldestItemInPage.Id))
            .SumAsync(x => (int)x.Sign * x.Quantity, cancellationToken);

        var newestItemInPage = pagedRows.OrderByDescending(x => x.Transaction.TransactionDate).ThenByDescending(x => x.Transaction.Id).First().Transaction;
        
        var relevantTransactions = await baseLedger
            .Where(x => 
                (x.TransactionDate > oldestItemInPage.TransactionDate || (x.TransactionDate == oldestItemInPage.TransactionDate && x.Id >= oldestItemInPage.Id)) &&
                (x.TransactionDate < newestItemInPage.TransactionDate || (x.TransactionDate == newestItemInPage.TransactionDate && x.Id <= newestItemInPage.Id))
            )
            .OrderBy(x => x.TransactionDate).ThenBy(x => x.Id)
            .Select(x => new { x.Id, Impact = (int)x.Sign * x.Quantity })
            .ToListAsync(cancellationToken);

        var runningBalances = new Dictionary<long, decimal>();
        decimal currentBalance = pastBalance;

        foreach (var t in relevantTransactions)
        {
            currentBalance += t.Impact;
            runningBalances[t.Id] = currentBalance;
        }

        // 6. ایجاد خروجی نهایی
        foreach (var row in pagedRows)
        {
            var t = row.Transaction;
            var isInc = t.Sign == InventoryTransactionSign.Increase;

            dtos.Add(new ProductCardexDto
            {
                TransactionId = t.Id,
                TransactionDate = t.TransactionDate,
                DocNumber = row.Header.DocNumber, 
                DocTypeTitle = row.DocType.Title,
                Description = row.Header.Description ?? "",
                WarehouseTitle = row.Warehouse.Title, // ✨ مقداردهی نام انبار
                BatchNumber = row.Batch?.BatchNumber ?? "",
                LocationCode = row.Location?.Code ?? "",
                SignTitle = isInc ? "وارده" : "صادره",
                InQuantity = isInc ? t.Quantity : 0,
                OutQuantity = !isInc ? t.Quantity : 0,
                RunningBalance = runningBalances.ContainsKey(t.Id) ? runningBalances[t.Id] : 0
            });
        }

        return new PaginatedResult<ProductCardexDto>(dtos, totalCount, request.PageNumber, request.PageSize);
    }

    private string MapColumn(string? column)
    {
        if (string.IsNullOrWhiteSpace(column)) return "Transaction.TransactionDate";
        
        return column.ToLower() switch
        {
            "transactionid" => "Transaction.Id",
            "transactiondate" => "Transaction.TransactionDate",
            "warehousetitle" => "Warehouse.Title", // ✨ مپینگ برای فیلتر و سورت روی نام انبار
            "docnumber" => "Header.DocNumber",
            "doctypetitle" => "DocType.Title",
            "description" => "Header.Description",
            "batchnumber" => "Batch.BatchNumber",
            "locationcode" => "Location.Code",
            "inquantity" => "", 
            "outquantity" => "", 
            "signtitle" => "", 
            "runningbalance" => "", 
            _ => "Transaction." + char.ToUpperInvariant(column[0]) + column.Substring(1)
        };
    }

    private string ConvertPersianNumbers(string input)
    {
        return input.Replace("۰", "0").Replace("۱", "1").Replace("۲", "2").Replace("۳", "3").Replace("۴", "4")
                    .Replace("۵", "5").Replace("۶", "6").Replace("۷", "7").Replace("۸", "8").Replace("۹", "9");
    }
}






















// using ERPDotNet.Application.Common.Extensions; 
// using ERPDotNet.Application.Common.Interfaces;
// using ERPDotNet.Application.Common.Models;
// using ERPDotNet.Application.Modules.Inventory.DTOs;
// using ERPDotNet.Domain.Modules.Inventory.Enums;
// using FluentValidation;
// using MediatR;
// using Microsoft.EntityFrameworkCore;

// namespace ERPDotNet.Application.Modules.Inventory.Queries.GetProductCardex;

// public record GetProductCardexQuery : IRequest<PaginatedResult<ProductCardexDto>>
// {
//     public int WarehouseId { get; set; }
//     public int ProductId { get; set; }
    
//     public DateTime? FromDate { get; set; }
//     public DateTime? ToDate { get; set; }

//     public int PageNumber { get; set; } = 1;
//     public int PageSize { get; set; } = 20;
// }

// public class GetProductCardexValidator : AbstractValidator<GetProductCardexQuery>
// {
//     public GetProductCardexValidator()
//     {
//         RuleFor(x => x.WarehouseId).GreaterThan(0).WithMessage("انتخاب انبار الزامی است.");
//         RuleFor(x => x.ProductId).GreaterThan(0).WithMessage("انتخاب کالا الزامی است.");
//     }
// }

// public class GetProductCardexHandler : IRequestHandler<GetProductCardexQuery, PaginatedResult<ProductCardexDto>>
// {
//     private readonly IApplicationDbContext _context;

//     public GetProductCardexHandler(IApplicationDbContext context)
//     {
//         _context = context;
//     }

//     public async Task<PaginatedResult<ProductCardexDto>> Handle(GetProductCardexQuery request, CancellationToken cancellationToken)
//     {
//         // 1. کوئری پایه (بدون اجرا)
//         var transactionsQuery = _context.InventoryTransactions
//             .AsNoTracking()
//             .Where(x => x.WarehouseId == request.WarehouseId && 
//                         x.ProductId == request.ProductId);

//         // ---------------------------------------------------------
//         // 2. محاسبه موجودی اول دوره (Opening Balance)
//         // ---------------------------------------------------------
//         decimal openingBalance = 0;
//         if (request.FromDate.HasValue)
//         {
//             openingBalance = await transactionsQuery
//                 .Where(x => x.TransactionDate < request.FromDate.Value)
//                 .SumAsync(x => (int)x.Sign * x.Quantity, cancellationToken);
//         }

//         // ---------------------------------------------------------
//         // 3. اعمال فیلتر تاریخ روی کوئری اصلی
//         // ---------------------------------------------------------
//         var mainQuery = transactionsQuery;

//         if (request.FromDate.HasValue)
//             mainQuery = mainQuery.Where(x => x.TransactionDate >= request.FromDate.Value);
        
//         if (request.ToDate.HasValue)
//             mainQuery = mainQuery.Where(x => x.TransactionDate <= request.ToDate.Value);

//         // مرتب‌سازی: تاریخ صعودی، سپس به ترتیب ثبت (Id)
//         mainQuery = mainQuery.OrderBy(x => x.TransactionDate).ThenBy(x => x.Id);

//         // ---------------------------------------------------------
//         // 4. محاسبه موجودیِ رد شده (Skipped Balance)
//         // ---------------------------------------------------------
//         decimal skippedBalance = 0;
//         if (request.PageNumber > 1)
//         {
//             var skipCount = (request.PageNumber - 1) * request.PageSize;
            
//             skippedBalance = await mainQuery
//                 .Take(skipCount)
//                 .SumAsync(x => (int)x.Sign * x.Quantity, cancellationToken);
//         }

//         decimal currentRunningBalance = openingBalance + skippedBalance;

//         // ---------------------------------------------------------
//         // 5. دریافت دیتای صفحه جاری با Join
//         // ---------------------------------------------------------
//         var queryWithDetails = from t in mainQuery
//                                join h in _context.InventoryDocHeaders on t.DocHeaderId equals h.Id
//                                join dt in _context.InventoryDocTypes on t.DocTypeId equals dt.Id
//                                // Left Join Batch
//                                join b in _context.InventoryBatches on t.BatchId equals b.Id into bJoin
//                                from batch in bJoin.DefaultIfEmpty()
//                                // Left Join Location
//                                join l in _context.Locations on t.LocationId equals l.Id into lJoin
//                                from loc in lJoin.DefaultIfEmpty()
//                                select new 
//                                {
//                                    t.Id,
//                                    t.TransactionDate,
//                                    t.Sign,
//                                    t.Quantity,
//                                    h.DocNumber,
//                                    h.Description,
//                                    DocTypeTitle = dt.Title,
//                                    BatchNumber = batch != null ? batch.BatchNumber : "",
//                                    LocationCode = loc != null ? loc.Code : ""
//                                };

//         // دریافت لیست
//         var paginatedResult = await queryWithDetails
//             .ToPaginatedListAsync(request.PageNumber, request.PageSize, cancellationToken);

//         // ---------------------------------------------------------
//         // 6. تبدیل نهایی به DTO و محاسبه مانده
//         // ---------------------------------------------------------
//         var finalItems = new List<ProductCardexDto>();

//         foreach (var item in paginatedResult.Items)
//         {
//             var signedQuantity = (int)item.Sign * item.Quantity;
//             currentRunningBalance += signedQuantity;

//             finalItems.Add(new ProductCardexDto
//             {
//                 TransactionId = item.Id,
//                 TransactionDate = item.TransactionDate,
                
//                 DocNumber = item.DocNumber,
//                 DocTypeTitle = item.DocTypeTitle,
//                 Description = item.Description,
                
//                 BatchNumber = item.BatchNumber,
//                 LocationCode = item.LocationCode,

//                 // استفاده از عدد اینام برای تشخیص جهت
//                 // فعلاً دستی می‌نویسیم چون اتریبیوت Display در فایل Enum شما نبود
//                 SignTitle = item.Sign == InventoryTransactionSign.Increase ? "وارده" : "صادره",
                
//                 InQuantity = item.Sign == InventoryTransactionSign.Increase ? item.Quantity : 0,
//                 OutQuantity = item.Sign == InventoryTransactionSign.Decrease ? item.Quantity : 0,
                
//                 RunningBalance = currentRunningBalance
//             });
//         }

//         // اصلاح خط آخر: استفاده از request.PageSize به جای paginatedResult.PageSize
//         return new PaginatedResult<ProductCardexDto>(
//             finalItems, 
//             paginatedResult.TotalCount, 
//             paginatedResult.PageNumber, 
//             request.PageSize); // ✅ اینجا اصلاح شد
//     }
// }