using Dapper;
using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Common.Extensions; // برای ToDisplay
using MediatR;
using Microsoft.EntityFrameworkCore;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities; // برای BOMStatus

namespace ERPDotNet.Application.Modules.ProductEngineering.Queries.GetWhereUsed;

[Cached(timeToLiveSeconds: 60, "WhereUsed")]
public record GetWhereUsedQuery : PaginatedRequest, IRequest<PaginatedResult<WhereUsedDto>>
{
    public int ProductId { get; set; }
    public bool MultiLevel { get; set; } = false;
    public bool EndItemsOnly { get; set; } = false;
}

public class GetWhereUsedHandler : IRequestHandler<GetWhereUsedQuery, PaginatedResult<WhereUsedDto>>
{
    private readonly IApplicationDbContext _context;

    public GetWhereUsedHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<WhereUsedDto>> Handle(GetWhereUsedQuery request, CancellationToken cancellationToken)
    {
        var connection = _context.Database.GetDbConnection();
        IEnumerable<WhereUsedRawDto> rawResult;

        if (request.MultiLevel || request.EndItemsOnly)
        {
            // === حالت چند سطحی با CTE (بدون نیاز به تابع SQL) ===
            var sql = @"
                WITH RecursiveWhereUsed AS (
                    -- Anchor: مصرف مستقیم (سطح ۱)
                    SELECT 
                        H.Id AS BomId,
                        H.Title AS BomTitle,
                        H.Version AS BomVersion,
                        H.Status AS BomStatusId,
                        H.ProductId AS ParentProductId,
                        1 AS Level,
                        CAST(N'ماده اولیه' AS NVARCHAR(50)) AS UsageType,
                        D.Quantity
                    FROM [eng].[bom_details] D
                    JOIN [eng].[bom_headers] H ON D.BOMHeaderId = H.Id
                    WHERE D.ChildProductId = @ProductId
                      AND H.IsActive = 1

                    UNION ALL

                    -- Recursive: سطوح بالاتر (پدرِ پدر)
                    SELECT 
                        H.Id,
                        H.Title,
                        H.Version,
                        H.Status,
                        H.ProductId,
                        RW.Level + 1,
                        CAST(N'ماده اولیه' AS NVARCHAR(50)),
                        D.Quantity
                    FROM RecursiveWhereUsed RW
                    JOIN [eng].[bom_details] D ON D.ChildProductId = RW.ParentProductId
                    JOIN [eng].[bom_headers] H ON D.BOMHeaderId = H.Id
                    WHERE H.IsActive = 1
                )
                SELECT 
                    R.BomId,
                    R.BomTitle,
                    R.BomVersion,
                    R.BomStatusId,
                    R.ParentProductId,
                    P.Name AS ParentProductName,
                    P.Code AS ParentProductCode,
                    R.UsageType,
                    R.Level,
                    R.Quantity,
                    U.Title AS UnitName
                FROM RecursiveWhereUsed R
                JOIN [base].[Products] P ON R.ParentProductId = P.Id
                LEFT JOIN [base].[Units] U ON P.UnitId = U.Id
                ORDER BY R.Level
            ";

            rawResult = await connection.QueryAsync<WhereUsedRawDto>(sql, new { ProductId = request.ProductId });
        }
        else
        {
            // === حالت تک سطحی (شامل جایگزین‌ها) ===
            var sqlDirect = @"
                SELECT 
                    H.Id AS BomId,
                    H.Title AS BomTitle,
                    H.Version AS BomVersion,
                    H.Status AS BomStatusId,
                    H.ProductId AS ParentProductId,
                    P.Name AS ParentProductName,
                    P.Code AS ParentProductCode,
                    1 AS Level,
                    CAST(N'ماده اولیه' AS NVARCHAR(50)) AS UsageType,
                    D.Quantity,
                    U.Title AS UnitName
                FROM [eng].[bom_details] D
                JOIN [eng].[bom_headers] H ON D.BOMHeaderId = H.Id
                JOIN [base].[Products] P ON H.ProductId = P.Id
                LEFT JOIN [base].[Units] U ON P.UnitId = U.Id
                WHERE D.ChildProductId = @ProductId AND H.IsActive = 1

                UNION ALL

                SELECT 
                    H.Id, H.Title, H.Version, H.Status, H.ProductId, P.Name, P.Code,
                    1 AS Level,
                    CAST(N'جایگزین' AS NVARCHAR(50)) AS UsageType,
                    S.Factor AS Quantity,
                    U.Title
                FROM [eng].[bom_substitutes] S
                JOIN [eng].[bom_details] D ON S.BOMDetailId = D.Id
                JOIN [eng].[bom_headers] H ON D.BOMHeaderId = H.Id
                JOIN [base].[Products] P ON H.ProductId = P.Id
                LEFT JOIN [base].[Units] U ON P.UnitId = U.Id
                WHERE S.SubstituteProductId = @ProductId AND H.IsActive = 1
            ";

            rawResult = await connection.QueryAsync<WhereUsedRawDto>(sqlDirect, new { ProductId = request.ProductId });
        }

        // --- پردازش نهایی در حافظه ---
        var finalItems = rawResult.ToList();

        // فیلتر محصولات نهایی (End Items Only)
        if (request.EndItemsOnly)
        {
            // محصول نهایی یعنی محصولی که خودش در هیچ BOM فعالی به عنوان زیرمجموعه استفاده نشده باشد
            // ابتدا تمام ParentId های پیدا شده را لیست می‌کنیم
            var allFoundParents = finalItems.Select(x => x.ParentProductId).Distinct().ToList();
            
            // چک می‌کنیم کدام یک از این‌ها در جدول Details وجود دارند (یعنی مصرف شده‌اند)
            if (allFoundParents.Any())
            {
                var queryCheck = @"SELECT DISTINCT ChildProductId FROM [eng].[bom_details] D 
                                   JOIN [eng].[bom_headers] H ON D.BOMHeaderId = H.Id 
                                   WHERE H.IsActive = 1 AND D.ChildProductId IN @Ids";
                
                var notEndItemIds = await connection.QueryAsync<int>(queryCheck, new { Ids = allFoundParents });
                
                // آن‌هایی را نگه دار که جزو مصرف‌شده‌ها نیستند
                finalItems = finalItems.Where(x => !notEndItemIds.Contains(x.ParentProductId)).ToList();
            }
        }

        // تبدیل به DTO نهایی و فرمت‌دهی
        var mappedDtos = finalItems.Select(r => new WhereUsedDto(
            r.BomId, // Id سطر (یکتا سازی برای فرانت)
            r.BomId,
            r.BomTitle,
            r.BomVersion,
            ((BOMStatus)r.BomStatusId).ToDisplay(), // تبدیل Enum به فارسی
            r.ParentProductId,
            r.ParentProductName,
            r.ParentProductCode,
            r.Level > 1 ? $"{r.UsageType} (سطح {r.Level})" : r.UsageType,
            r.Quantity,
            r.UnitName ?? "-"
        )).ToList();

        // صفحه‌بندی
        var pagedItems = mappedDtos
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToList();

        return new PaginatedResult<WhereUsedDto>(pagedItems, mappedDtos.Count, request.PageNumber, request.PageSize);
    }

    // کلاس کمکی برای دریافت خروجی Dapper
    private class WhereUsedRawDto
    {
        public int BomId { get; set; }
        public string BomTitle { get; set; } = "";
        public string BomVersion { get; set; } = "";
        public int BomStatusId { get; set; }
        public int ParentProductId { get; set; }
        public string ParentProductName { get; set; } = "";
        public string ParentProductCode { get; set; } = "";
        public int Level { get; set; }
        public string UsageType { get; set; } = "";
        public decimal Quantity { get; set; }
        public string? UnitName { get; set; }
    }
}