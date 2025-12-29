using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ERPDotNet.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPermisionToBom : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 202,
                columns: new[] { "IsMenu", "Name", "Title", "Url" },
                values: new object[] { false, "ProductEngineering.BOM.View", "مشاهده BOM", null });

            migrationBuilder.InsertData(
                schema: "security",
                table: "permissions",
                columns: new[] { "Id", "IsMenu", "Name", "ParentId", "Title", "Url" },
                values: new object[,]
                {
                    { 203, false, "ProductEngineering.BOM.Edit", 200, "ویرایش BOM", null },
                    { 204, false, "ProductEngineering.BOM.Delete", 200, "حذف BOM", null },
                    { 205, true, "ProductEngineering.BOM.Reports", 200, "گزارش BOM", "/product-engineering/boms" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 203);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 204);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 205);

            migrationBuilder.UpdateData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 202,
                columns: new[] { "IsMenu", "Name", "Title", "Url" },
                values: new object[] { true, "ProductEngineering.BOM.Reports", "گزارش BOM", "/product-engineering/boms" });
        }
    }
}
