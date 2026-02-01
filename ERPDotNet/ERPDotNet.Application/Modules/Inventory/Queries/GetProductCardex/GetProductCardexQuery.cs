using ERPDotNet.Application.Common.Extensions; 
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.Inventory.DTOs;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Queries.GetProductCardex;

public record GetProductCardexQuery : IRequest<PaginatedResult<ProductCardexDto>>
{
    public int WarehouseId { get; set; }
    public int ProductId { get; set; }
    
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }

    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class GetProductCardexValidator : AbstractValidator<GetProductCardexQuery>
{
    public GetProductCardexValidator()
    {
        RuleFor(x => x.WarehouseId).GreaterThan(0).WithMessage("انتخاب انبار الزامی است.");
        RuleFor(x => x.ProductId).GreaterThan(0).WithMessage("انتخاب کالا الزامی است.");
    }
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
        // 1. کوئری پایه (بدون اجرا)
        var transactionsQuery = _context.InventoryTransactions
            .AsNoTracking()
            .Where(x => x.WarehouseId == request.WarehouseId && 
                        x.ProductId == request.ProductId);

        // ---------------------------------------------------------
        // 2. محاسبه موجودی اول دوره (Opening Balance)
        // ---------------------------------------------------------
        decimal openingBalance = 0;
        if (request.FromDate.HasValue)
        {
            openingBalance = await transactionsQuery
                .Where(x => x.TransactionDate < request.FromDate.Value)
                .SumAsync(x => (int)x.Sign * x.Quantity, cancellationToken);
        }

        // ---------------------------------------------------------
        // 3. اعمال فیلتر تاریخ روی کوئری اصلی
        // ---------------------------------------------------------
        var mainQuery = transactionsQuery;

        if (request.FromDate.HasValue)
            mainQuery = mainQuery.Where(x => x.TransactionDate >= request.FromDate.Value);
        
        if (request.ToDate.HasValue)
            mainQuery = mainQuery.Where(x => x.TransactionDate <= request.ToDate.Value);

        // مرتب‌سازی: تاریخ صعودی، سپس به ترتیب ثبت (Id)
        mainQuery = mainQuery.OrderBy(x => x.TransactionDate).ThenBy(x => x.Id);

        // ---------------------------------------------------------
        // 4. محاسبه موجودیِ رد شده (Skipped Balance)
        // ---------------------------------------------------------
        decimal skippedBalance = 0;
        if (request.PageNumber > 1)
        {
            var skipCount = (request.PageNumber - 1) * request.PageSize;
            
            skippedBalance = await mainQuery
                .Take(skipCount)
                .SumAsync(x => (int)x.Sign * x.Quantity, cancellationToken);
        }

        decimal currentRunningBalance = openingBalance + skippedBalance;

        // ---------------------------------------------------------
        // 5. دریافت دیتای صفحه جاری با Join
        // ---------------------------------------------------------
        var queryWithDetails = from t in mainQuery
                               join h in _context.InventoryDocHeaders on t.DocHeaderId equals h.Id
                               join dt in _context.InventoryDocTypes on t.DocTypeId equals dt.Id
                               // Left Join Batch
                               join b in _context.InventoryBatches on t.BatchId equals b.Id into bJoin
                               from batch in bJoin.DefaultIfEmpty()
                               // Left Join Location
                               join l in _context.Locations on t.LocationId equals l.Id into lJoin
                               from loc in lJoin.DefaultIfEmpty()
                               select new 
                               {
                                   t.Id,
                                   t.TransactionDate,
                                   t.Sign,
                                   t.Quantity,
                                   h.DocNumber,
                                   h.Description,
                                   DocTypeTitle = dt.Title,
                                   BatchNumber = batch != null ? batch.BatchNumber : "",
                                   LocationCode = loc != null ? loc.Code : ""
                               };

        // دریافت لیست
        var paginatedResult = await queryWithDetails
            .ToPaginatedListAsync(request.PageNumber, request.PageSize, cancellationToken);

        // ---------------------------------------------------------
        // 6. تبدیل نهایی به DTO و محاسبه مانده
        // ---------------------------------------------------------
        var finalItems = new List<ProductCardexDto>();

        foreach (var item in paginatedResult.Items)
        {
            var signedQuantity = (int)item.Sign * item.Quantity;
            currentRunningBalance += signedQuantity;

            finalItems.Add(new ProductCardexDto
            {
                TransactionId = item.Id,
                TransactionDate = item.TransactionDate,
                
                DocNumber = item.DocNumber,
                DocTypeTitle = item.DocTypeTitle,
                Description = item.Description,
                
                BatchNumber = item.BatchNumber,
                LocationCode = item.LocationCode,

                // استفاده از عدد اینام برای تشخیص جهت
                // فعلاً دستی می‌نویسیم چون اتریبیوت Display در فایل Enum شما نبود
                SignTitle = item.Sign == InventoryTransactionSign.Increase ? "وارده" : "صادره",
                
                InQuantity = item.Sign == InventoryTransactionSign.Increase ? item.Quantity : 0,
                OutQuantity = item.Sign == InventoryTransactionSign.Decrease ? item.Quantity : 0,
                
                RunningBalance = currentRunningBalance
            });
        }

        // اصلاح خط آخر: استفاده از request.PageSize به جای paginatedResult.PageSize
        return new PaginatedResult<ProductCardexDto>(
            finalItems, 
            paginatedResult.TotalCount, 
            paginatedResult.PageNumber, 
            request.PageSize); // ✅ اینجا اصلاح شد
    }
}