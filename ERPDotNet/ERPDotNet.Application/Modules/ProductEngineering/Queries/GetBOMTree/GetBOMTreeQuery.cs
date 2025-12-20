using Dapper;
using ERPDotNet.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace ERPDotNet.Application.Modules.ProductEngineering.Queries.GetBOMTree;

public record GetBOMTreeQuery(int BomId) : IRequest<BOMTreeNodeDto?>;

public class GetBOMTreeHandler : IRequestHandler<GetBOMTreeQuery, BOMTreeNodeDto?>
{
    private readonly IApplicationDbContext _context;

    public GetBOMTreeHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<BOMTreeNodeDto?> Handle(GetBOMTreeQuery request, CancellationToken cancellationToken)
    {
        var connection = _context.Database.GetDbConnection();

        // کوئری نهایی و تست شده (با نام جداول [eng] و [base])
        var sql = @"
            WITH ActiveBOMs_Raw AS (
                SELECT 
                    Id, 
                    ProductId, 
                    ROW_NUMBER() OVER(PARTITION BY ProductId ORDER BY Version DESC) as RowNum
                FROM [eng].[bom_headers]
                WHERE IsActive = 1 AND Status = 3
            ),
            LatestBOMs AS (
                SELECT Id AS BomId, ProductId
                FROM ActiveBOMs_Raw
                WHERE RowNum = 1
            ),
            RecursiveBOM AS (
                -- Anchor Member: ریشه درخت
                SELECT 
                    0 AS Level,
                    CAST(H.ProductId AS VARCHAR(MAX)) AS Path,
                    NULL AS ParentProductId,
                    H.ProductId,
                    H.Id AS BomId,
                    CAST(1 AS DECIMAL(18,4)) AS Quantity,
                    CAST(1 AS DECIMAL(18,4)) AS TotalQuantity,
                    CAST(0 AS DECIMAL(18,4)) AS WastePercentage
                FROM [eng].[bom_headers] H
                WHERE H.Id = @RootBomId

                UNION ALL

                -- Recursive Member: فرزندان
                SELECT 
                    RB.Level + 1,
                    CAST(RB.Path + '-' + CAST(D.ChildProductId AS VARCHAR(MAX)) AS VARCHAR(MAX)),
                    RB.ProductId AS ParentProductId,
                    D.ChildProductId,
                    
                    (SELECT BomId FROM LatestBOMs LB WHERE LB.ProductId = D.ChildProductId) AS BomId,
                    
                    CAST(D.Quantity AS DECIMAL(18,4)), 
                    CAST(D.Quantity * RB.TotalQuantity AS DECIMAL(18,4)), 
                    CAST(D.WastePercentage AS DECIMAL(18,4))

                FROM [eng].[bom_details] D
                JOIN RecursiveBOM RB ON D.BOMHeaderId = RB.BomId
            )

            SELECT 
                RB.Level,
                RB.Path,
                RB.ParentProductId,
                RB.ProductId,
                P.Name AS ProductName,
                P.Code AS ProductCode,
                U.Title AS UnitName,
                RB.Quantity,
                RB.TotalQuantity,
                RB.WastePercentage,
                RB.BomId
            FROM RecursiveBOM RB
            JOIN [base].[Products] P ON RB.ProductId = P.Id
            LEFT JOIN [base].[Units] U ON P.UnitId = U.Id
            ORDER BY RB.Level, RB.Path;
        ";

        if (connection.State != ConnectionState.Open) await connection.OpenAsync(cancellationToken);

        // اجرا توسط Dapper
        var flatNodes = await connection.QueryAsync<BOMFlatNodeDto>(sql, new { RootBomId = request.BomId });

        if (!flatNodes.Any()) return null;

        return BuildTreeFromFlatList(flatNodes.ToList());
    }

    // تبدیل لیست تخت به ساختار درختی در حافظه
    private BOMTreeNodeDto? BuildTreeFromFlatList(List<BOMFlatNodeDto> flatNodes)
    {
        var lookup = new Dictionary<string, BOMTreeNodeDto>();
        BOMTreeNodeDto? root = null;

        foreach (var node in flatNodes)
        {
            var treeNode = new BOMTreeNodeDto(
                node.Path,
                node.BomId,
                node.ProductId,
                node.ProductName,
                node.ProductCode,
                node.UnitName ?? "-",
                node.Quantity,
                node.TotalQuantity,
                node.WastePercentage,
                node.BomId.HasValue ? "نیمه ساخته" : (node.Level == 0 ? "محصول نهایی" : "ماده اولیه"),
                node.BomId.HasValue || node.Level == 0, // IsRecursive
                new List<BOMTreeNodeDto>()
            );

            lookup[node.Path] = treeNode;

            if (node.Level == 0)
            {
                root = treeNode;
            }
            else
            {
                // پیدا کردن پدر: همه چیز قبل از آخرین خط تیره
                var lastDashIndex = node.Path.LastIndexOf('-');
                if (lastDashIndex > 0)
                {
                    var parentPath = node.Path.Substring(0, lastDashIndex);
                    if (lookup.TryGetValue(parentPath, out var parentNode))
                    {
                        parentNode.Children.Add(treeNode);
                    }
                }
            }
        }

        return root;
    }
}