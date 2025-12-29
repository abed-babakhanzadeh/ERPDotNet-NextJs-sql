using Dapper;
using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Common.Extensions; // برای ToDisplay
using MediatR;
using Microsoft.EntityFrameworkCore;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;

namespace ERPDotNet.Application.Modules.ProductEngineering.Queries.GetWhereUsed;

[Cached(timeToLiveSeconds: 60, "WhereUsed")]
public record GetWhereUsedQuery : PaginatedRequest, IRequest<PaginatedResult<WhereUsedDto>>
{
    public int ProductId { get; set; }
    public bool MultiLevel { get; set; } = false;
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
        IEnumerable<WhereUsedRecursiveResult> rawResult;

        var sql = @"
            WITH WhereUsed_CTE AS (
                -- 1. حالت استفاده مستقیم (Direct Material)
                SELECT 
                    h.Id AS BomId,
                    h.Title AS BomTitle,
                    h.Version AS BomVersion,
                    h.Status AS BomStatusId,
                    h.Usage AS BomUsageId,
                    
                    p.Id AS ParentProductId,
                    p.Name AS ParentProductName,
                    p.Code AS ParentProductCode,
                    u.Name AS UnitName,
                    
                    CAST(N'ماده اولیه' AS NVARCHAR(50)) AS UsageType,
                    d.Quantity,
                    1 AS Level,
                    CAST(p.Name AS NVARCHAR(MAX)) AS Path
                FROM [eng].[bom_details] d
                JOIN [eng].[bom_headers] h ON d.BOMHeaderId = h.Id
                JOIN [base].[products] p ON h.ProductId = p.Id
                LEFT JOIN [base].[units] u ON p.UnitId = u.Id
                WHERE d.ChildProductId = @ProductId
                  AND h.IsDeleted = 0
                  AND d.IsDeleted = 0

                UNION ALL

                -- 2. حالت استفاده به عنوان جایگزین (Substitute)
                SELECT 
                    h.Id AS BomId,
                    h.Title AS BomTitle,
                    h.Version AS BomVersion,
                    h.Status AS BomStatusId,
                    h.Usage AS BomUsageId,

                    p.Id AS ParentProductId,
                    p.Name AS ParentProductName,
                    p.Code AS ParentProductCode,
                    u.Name AS UnitName,

                    CAST(N'جایگزین' AS NVARCHAR(50)) AS UsageType,
                    s.Factor AS Quantity,
                    1 AS Level,
                    CAST(p.Name + N' (جایگزین)' AS NVARCHAR(MAX)) AS Path
                FROM [eng].[bom_substitutes] s
                JOIN [eng].[bom_details] d ON s.BOMDetailId = d.Id
                JOIN [eng].[bom_headers] h ON d.BOMHeaderId = h.Id
                JOIN [base].[products] p ON h.ProductId = p.Id
                LEFT JOIN [base].[units] u ON p.UnitId = u.Id
                WHERE s.SubstituteProductId = @ProductId
                  AND h.IsDeleted = 0
                  AND s.IsDeleted = 0

                UNION ALL

                -- 3. بازگشتی (Recursive) برای سطوح بالاتر
                SELECT 
                    h.Id,
                    h.Title,
                    h.Version,
                    h.Status,
                    h.Usage,

                    p.Id,
                    p.Name,
                    p.Code,
                    u.Name,

                    CAST(N'نیمه ساخته' AS NVARCHAR(50)),
                    d.Quantity,
                    cte.Level + 1,
                    CAST(cte.Path + N' > ' + p.Name AS NVARCHAR(MAX))
                FROM WhereUsed_CTE cte
                JOIN [eng].[bom_details] d ON d.ChildProductId = cte.ParentProductId
                JOIN [eng].[bom_headers] h ON d.BOMHeaderId = h.Id
                JOIN [base].[products] p ON h.ProductId = p.Id
                LEFT JOIN [base].[units] u ON p.UnitId = u.Id
                WHERE @MultiLevel = 1 
                  AND h.IsDeleted = 0
            )
            SELECT * FROM WhereUsed_CTE
            ORDER BY Level, ParentProductName
        ";

        rawResult = await connection.QueryAsync<WhereUsedRecursiveResult>(sql, new 
        { 
            ProductId = request.ProductId, 
            MultiLevel = request.MultiLevel ? 1 : 0 
        });

        var finalItems = rawResult.ToList();

        // تبدیل به DTO
        var mappedDtos = finalItems.Select(r => new WhereUsedDto(
            r.BomId, 
            r.BomId,
            r.BomTitle,
            r.BomVersion,
            ((BOMStatus)r.BomStatusId).ToDisplay(),
            
            r.BomUsageId,
            ((BOMUsage)r.BomUsageId).ToDisplay(), // تبدیل Enum به متن (اصلی/فرعی)

            r.ParentProductId,
            r.ParentProductName,
            r.ParentProductCode,
            
            r.UsageType,
            r.Quantity,
            r.UnitName ?? "-",
            r.Level,
            r.Path
        )).ToList();

        var pagedItems = mappedDtos
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToList();

        return new PaginatedResult<WhereUsedDto>(pagedItems, mappedDtos.Count, request.PageNumber, request.PageSize);
    }
}