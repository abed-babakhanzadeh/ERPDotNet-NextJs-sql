using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProductCategoryBarcodeTaxCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Barcode",
                schema: "base",
                table: "products",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CategoryId",
                schema: "base",
                table: "products",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TaxCode",
                schema: "base",
                table: "products",
                type: "nvarchar(13)",
                maxLength: 13,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "product_categories",
                schema: "base",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ParentId = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_categories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_categories_product_categories_ParentId",
                        column: x => x.ParentId,
                        principalSchema: "base",
                        principalTable: "product_categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "security",
                table: "permissions",
                columns: new[] { "Id", "IsMenu", "Name", "ParentId", "Title", "Url" },
                values: new object[,]
                {
                    { 51, true, "BaseInfo.ProductCategories", 30, "گروه‌های کالا", "/base-info/product-categories" },
                    { 52, false, "BaseInfo.ProductCategories.Create", 51, "تعریف گروه کالا", null },
                    { 53, false, "BaseInfo.ProductCategories.Edit", 51, "ویرایش گروه کالا", null },
                    { 54, false, "BaseInfo.ProductCategories.Delete", 51, "حذف گروه کالا", null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_products_Barcode",
                schema: "base",
                table: "products",
                column: "Barcode",
                unique: true,
                filter: "[Barcode] IS NOT NULL AND [IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_products_CategoryId",
                schema: "base",
                table: "products",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_product_categories_Code",
                schema: "base",
                table: "product_categories",
                column: "Code",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_product_categories_ParentId",
                schema: "base",
                table: "product_categories",
                column: "ParentId");

            migrationBuilder.AddForeignKey(
                name: "FK_products_product_categories_CategoryId",
                schema: "base",
                table: "products",
                column: "CategoryId",
                principalSchema: "base",
                principalTable: "product_categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_products_product_categories_CategoryId",
                schema: "base",
                table: "products");

            migrationBuilder.DropTable(
                name: "product_categories",
                schema: "base");

            migrationBuilder.DropIndex(
                name: "IX_products_Barcode",
                schema: "base",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_products_CategoryId",
                schema: "base",
                table: "products");

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 52);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 53);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 54);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 51);

            migrationBuilder.DropColumn(
                name: "Barcode",
                schema: "base",
                table: "products");

            migrationBuilder.DropColumn(
                name: "CategoryId",
                schema: "base",
                table: "products");

            migrationBuilder.DropColumn(
                name: "TaxCode",
                schema: "base",
                table: "products");
        }
    }
}
