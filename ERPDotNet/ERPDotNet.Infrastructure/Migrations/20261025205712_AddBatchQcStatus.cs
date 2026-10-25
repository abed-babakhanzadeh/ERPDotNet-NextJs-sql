using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBatchQcStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "RequiresQc",
                schema: "inventory",
                table: "InventoryItemProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "AllowsUnreleasedBatches",
                schema: "inventory",
                table: "InventoryDocTypes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "QcCheckedAt",
                schema: "inventory",
                table: "InventoryBatches",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QcCheckedBy",
                schema: "inventory",
                table: "InventoryBatches",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QcNote",
                schema: "inventory",
                table: "InventoryBatches",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "QcStatus",
                schema: "inventory",
                table: "InventoryBatches",
                type: "int",
                nullable: false,
                defaultValue: 1); // بچ‌های موجود تأییدشده فرض می‌شوند

            migrationBuilder.InsertData(
                schema: "security",
                table: "permissions",
                columns: new[] { "Id", "IsMenu", "Name", "ParentId", "Title", "Url" },
                values: new object[] { 3123, false, "Inventory.Batches.Qc", 3120, "ثبت نتیجه کنترل کیفیت بچ", null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3123);

            migrationBuilder.DropColumn(
                name: "RequiresQc",
                schema: "inventory",
                table: "InventoryItemProfiles");

            migrationBuilder.DropColumn(
                name: "AllowsUnreleasedBatches",
                schema: "inventory",
                table: "InventoryDocTypes");

            migrationBuilder.DropColumn(
                name: "QcCheckedAt",
                schema: "inventory",
                table: "InventoryBatches");

            migrationBuilder.DropColumn(
                name: "QcCheckedBy",
                schema: "inventory",
                table: "InventoryBatches");

            migrationBuilder.DropColumn(
                name: "QcNote",
                schema: "inventory",
                table: "InventoryBatches");

            migrationBuilder.DropColumn(
                name: "QcStatus",
                schema: "inventory",
                table: "InventoryBatches");
        }
    }
}
