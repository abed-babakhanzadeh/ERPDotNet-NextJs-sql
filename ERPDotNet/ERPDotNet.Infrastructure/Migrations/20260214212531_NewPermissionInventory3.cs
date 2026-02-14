using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class NewPermissionInventory3 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
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
                keyValue: 3100,
                column: "Title",
                value: "اطلاعات پایه انبار");

            migrationBuilder.UpdateData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3101,
                column: "Title",
                value: "مدیریت انبارها");

            migrationBuilder.UpdateData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3102,
                columns: new[] { "Name", "Title" },
                values: new object[] { "Inventory.Warehouses.View", "مشاهده انبارها" });

            migrationBuilder.UpdateData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3103,
                columns: new[] { "Name", "Title" },
                values: new object[] { "Inventory.Warehouses.Create", "تعریف انبار جدید" });

            migrationBuilder.UpdateData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3104,
                columns: new[] { "Name", "Title" },
                values: new object[] { "Inventory.Warehouses.Edit", "ویرایش انبار" });

            migrationBuilder.UpdateData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3105,
                columns: new[] { "IsMenu", "Name", "ParentId", "Title", "Url" },
                values: new object[] { false, "Inventory.Warehouses.Delete", 3101, "حذف انبار", null });

            migrationBuilder.UpdateData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3106,
                columns: new[] { "Name", "ParentId", "Title" },
                values: new object[] { "Inventory.Warehouses.Locations", 3101, "مدیریت قفسه‌بندی (Locations)" });

            migrationBuilder.InsertData(
                schema: "security",
                table: "permissions",
                columns: new[] { "Id", "IsMenu", "Name", "ParentId", "Title", "Url" },
                values: new object[,]
                {
                    { 3110, true, "Inventory.DocTypes", 3100, "انواع سند", "/inventory/doc-types" },
                    { 3111, false, "Inventory.DocTypes.View", 3110, "مشاهده انواع سند", null },
                    { 3112, false, "Inventory.DocTypes.Create", 3110, "تعریف نوع سند", null },
                    { 3113, false, "Inventory.DocTypes.Edit", 3110, "ویرایش نوع سند", null },
                    { 3114, false, "Inventory.DocTypes.Delete", 3110, "حذف نوع سند", null }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3111);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3112);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3113);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3114);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3110);

            migrationBuilder.UpdateData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3100,
                column: "Title",
                value: "اطلاعات پایه");

            migrationBuilder.UpdateData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3101,
                column: "Title",
                value: "تعریف انبارها");

            migrationBuilder.UpdateData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3102,
                columns: new[] { "Name", "Title" },
                values: new object[] { "Inventory.Warehouses.Define", "افزودن انبار" });

            migrationBuilder.UpdateData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3103,
                columns: new[] { "Name", "Title" },
                values: new object[] { "Inventory.Locations.Define", "مدیریت قفسه/لوکیشن" });

            migrationBuilder.UpdateData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3104,
                columns: new[] { "Name", "Title" },
                values: new object[] { "Inventory.Warehouses.View", "مشاهده لیست انبارها" });

            migrationBuilder.UpdateData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3105,
                columns: new[] { "IsMenu", "Name", "ParentId", "Title", "Url" },
                values: new object[] { true, "Inventory.DocTypes", 3100, "انواع سند", "/inventory/doc-types" });

            migrationBuilder.UpdateData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3106,
                columns: new[] { "Name", "ParentId", "Title" },
                values: new object[] { "Inventory.DocTypes.Define", 3105, "تعریف نوع سند" });

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
    }
}
