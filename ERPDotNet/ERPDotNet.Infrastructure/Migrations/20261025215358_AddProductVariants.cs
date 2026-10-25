using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProductVariants : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "VariantParentId",
                schema: "base",
                table: "products",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "product_attributes",
                schema: "base",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
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
                    table.PrimaryKey("PK_product_attributes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "product_attribute_values",
                schema: "base",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AttributeId = table.Column<int>(type: "int", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_attribute_values", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_attribute_values_product_attributes_AttributeId",
                        column: x => x.AttributeId,
                        principalSchema: "base",
                        principalTable: "product_attributes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "product_variant_values",
                schema: "base",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    AttributeValueId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_variant_values", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_variant_values_product_attribute_values_AttributeValueId",
                        column: x => x.AttributeValueId,
                        principalSchema: "base",
                        principalTable: "product_attribute_values",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_product_variant_values_products_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "base",
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                schema: "security",
                table: "permissions",
                columns: new[] { "Id", "IsMenu", "Name", "ParentId", "Title", "Url" },
                values: new object[,]
                {
                    { 55, true, "BaseInfo.ProductAttributes", 30, "ویژگی‌های کالا", "/base-info/product-attributes" },
                    { 56, false, "BaseInfo.ProductAttributes.Create", 55, "تعریف ویژگی کالا", null },
                    { 57, false, "BaseInfo.ProductAttributes.Edit", 55, "ویرایش ویژگی کالا", null },
                    { 58, false, "BaseInfo.ProductAttributes.Delete", 55, "حذف ویژگی کالا", null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_products_VariantParentId",
                schema: "base",
                table: "products",
                column: "VariantParentId");

            migrationBuilder.CreateIndex(
                name: "IX_product_attribute_values_AttributeId_Code",
                schema: "base",
                table: "product_attribute_values",
                columns: new[] { "AttributeId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_attributes_Code",
                schema: "base",
                table: "product_attributes",
                column: "Code",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_product_variant_values_AttributeValueId",
                schema: "base",
                table: "product_variant_values",
                column: "AttributeValueId");

            migrationBuilder.CreateIndex(
                name: "IX_product_variant_values_ProductId_AttributeValueId",
                schema: "base",
                table: "product_variant_values",
                columns: new[] { "ProductId", "AttributeValueId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_products_products_VariantParentId",
                schema: "base",
                table: "products",
                column: "VariantParentId",
                principalSchema: "base",
                principalTable: "products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_products_products_VariantParentId",
                schema: "base",
                table: "products");

            migrationBuilder.DropTable(
                name: "product_variant_values",
                schema: "base");

            migrationBuilder.DropTable(
                name: "product_attribute_values",
                schema: "base");

            migrationBuilder.DropTable(
                name: "product_attributes",
                schema: "base");

            migrationBuilder.DropIndex(
                name: "IX_products_VariantParentId",
                schema: "base",
                table: "products");

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 56);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 57);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 58);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 55);

            migrationBuilder.DropColumn(
                name: "VariantParentId",
                schema: "base",
                table: "products");
        }
    }
}
