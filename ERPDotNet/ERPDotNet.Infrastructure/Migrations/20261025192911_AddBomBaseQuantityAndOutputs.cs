using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBomBaseQuantityAndOutputs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "BaseQuantity",
                schema: "eng",
                table: "bom_headers",
                type: "decimal(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                // فرمول‌های موجود برای یک واحد محصول تعریف شده بودند
                defaultValue: 1m);

            migrationBuilder.CreateTable(
                name: "bom_outputs",
                schema: "eng",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BOMHeaderId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,6)", precision: 18, scale: 6, nullable: false),
                    CostSharePercent = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bom_outputs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_bom_outputs_bom_headers_BOMHeaderId",
                        column: x => x.BOMHeaderId,
                        principalSchema: "eng",
                        principalTable: "bom_headers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_bom_outputs_products_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "base",
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_bom_outputs_BOMHeaderId_ProductId",
                schema: "eng",
                table: "bom_outputs",
                columns: new[] { "BOMHeaderId", "ProductId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_bom_outputs_ProductId",
                schema: "eng",
                table: "bom_outputs",
                column: "ProductId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "bom_outputs",
                schema: "eng");

            migrationBuilder.DropColumn(
                name: "BaseQuantity",
                schema: "eng",
                table: "bom_headers");
        }
    }
}
