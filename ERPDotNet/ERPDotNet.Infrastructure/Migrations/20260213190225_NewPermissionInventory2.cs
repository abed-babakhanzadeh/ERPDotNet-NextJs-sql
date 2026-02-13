using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class NewPermissionInventory2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3102,
                column: "Title",
                value: "افزودن انبار");

            migrationBuilder.InsertData(
                schema: "security",
                table: "permissions",
                columns: new[] { "Id", "IsMenu", "Name", "ParentId", "Title", "Url" },
                values: new object[,]
                {
                    { 3107, false, "Inventory.Warehouses.Edit", 3101, "ویرایش لیست انبارها", null },
                    { 3108, false, "Inventory.Warehouses.Delete", 3101, "حذف لیست انبارها", null }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3107);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3108);

            migrationBuilder.UpdateData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3102,
                column: "Title",
                value: "افزودن/ویرایش انبار");
        }
    }
}
