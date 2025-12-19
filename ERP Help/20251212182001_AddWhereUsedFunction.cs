using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERPDotNet.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWhereUsedFunction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            var sql = @"
            CREATE OR REPLACE FUNCTION ""get_where_used_recursive""(input_product_id INT)
            RETURNS TABLE (
                ""BomHeaderId"" INT,
                ""ProductId"" INT, -- کالای تولید شده (پدر)
                ""Level"" INT,
                ""UsageType"" TEXT,
                ""Quantity"" DECIMAL,
                ""Path"" TEXT
            ) AS $$
            BEGIN
                RETURN QUERY
                WITH RECURSIVE BOM_CTE AS (
                    -- 1. Anchor Member: استفاده مستقیم (ماده اولیه)
                    SELECT 
                        h.""Id"" AS ""BomHeaderId"",
                        h.""ProductId"",
                        1 AS ""Level"",
                        'ماده اولیه' AS ""UsageType"",
                        d.""Quantity"",
                        CAST(h.""ProductId"" AS TEXT) AS ""Path""
                    FROM ""eng"".""bom_details"" d
                    JOIN ""eng"".""bom_headers"" h ON d.""BOMHeaderId"" = h.""Id""
                    WHERE d.""ChildProductId"" = input_product_id AND h.""IsActive"" = TRUE

                    UNION ALL

                    -- 1.1. Anchor Member: استفاده به عنوان جایگزین
                    SELECT 
                        h.""Id"" AS ""BomHeaderId"",
                        h.""ProductId"",
                        1 AS ""Level"",
                        'جایگزین' AS ""UsageType"",
                        s.""Factor"" AS ""Quantity"",
                        CAST(h.""ProductId"" AS TEXT) AS ""Path""
                    FROM ""eng"".""bom_substitutes"" s
                    JOIN ""eng"".""bom_details"" d ON s.""BOMDetailId"" = d.""Id""
                    JOIN ""eng"".""bom_headers"" h ON d.""BOMHeaderId"" = h.""Id""
                    WHERE s.""SubstituteProductId"" = input_product_id AND h.""IsActive"" = TRUE

                    UNION ALL

                    -- 2. Recursive Member: پدرانِ پدرها
                    SELECT 
                        h.""Id"" AS ""BomHeaderId"",
                        h.""ProductId"",
                        cte.""Level"" + 1,
                        'ماده اولیه (غیرمستقیم)' AS ""UsageType"", -- در سطوح بالا همه ماده اولیه حساب می‌شوند
                        d.""Quantity"",
                        cte.""Path"" || '->' || CAST(h.""ProductId"" AS TEXT)
                    FROM ""eng"".""bom_details"" d
                    JOIN ""eng"".""bom_headers"" h ON d.""BOMHeaderId"" = h.""Id""
                    JOIN BOM_CTE cte ON d.""ChildProductId"" = cte.""ProductId""
                    WHERE h.""IsActive"" = TRUE
                )
                SELECT * FROM BOM_CTE;
            END;
            $$ LANGUAGE plpgsql;
            ";

            migrationBuilder.Sql(sql);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP FUNCTION IF EXISTS ""get_where_used_recursive""(INT);");
        }
    }
}
