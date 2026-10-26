using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddInventoryValuation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "TotalCost",
                schema: "inventory",
                table: "InventoryTransactions",
                type: "decimal(20,4)",
                precision: 20,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitCost",
                schema: "inventory",
                table: "InventoryTransactions",
                type: "decimal(18,6)",
                precision: 18,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitCost",
                schema: "inventory",
                table: "InventoryDocDetails",
                type: "decimal(18,6)",
                precision: 18,
                scale: 6,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "inventory_cost_balances",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CompanyId = table.Column<int>(type: "int", nullable: true),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    WarehouseId = table.Column<int>(type: "int", nullable: true),
                    Quantity = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    Value = table.Column<decimal>(type: "decimal(20,4)", precision: 20, scale: 4, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inventory_cost_balances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_inventory_cost_balances_Warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalSchema: "inventory",
                        principalTable: "Warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_inventory_cost_balances_products_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "base",
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "valuation_settings",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Method = table.Column<int>(type: "int", nullable: false),
                    Level = table.Column<int>(type: "int", nullable: false),
                    ProductionCostBasis = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_valuation_settings", x => x.Id);
                });

            migrationBuilder.InsertData(
                schema: "security",
                table: "permissions",
                columns: new[] { "Id", "IsMenu", "Name", "ParentId", "Title", "Url" },
                values: new object[,]
                {
                    { 3305, true, "Inventory.Reports.Valuation", 3300, "ارزش ریالی موجودی", "/inventory/reports/valuation" },
                    { 6000, true, "Settings", 1, "تنظیمات سیستم", null }
                });

            migrationBuilder.InsertData(
                schema: "inventory",
                table: "valuation_settings",
                columns: new[] { "Id", "CreatedAt", "CreatedBy", "IsDeleted", "LastModifiedAt", "LastModifiedBy", "Level", "Method", "ProductionCostBasis" },
                values: new object[] { 1, new DateTime(2026, 10, 26, 0, 0, 0, 0, DateTimeKind.Utc), null, false, null, null, 1, 1, 1 });

            migrationBuilder.InsertData(
                schema: "security",
                table: "permissions",
                columns: new[] { "Id", "IsMenu", "Name", "ParentId", "Title", "Url" },
                values: new object[,]
                {
                    { 6100, true, "Settings.InventoryValuation", 6000, "ارزش‌گذاری موجودی", "/settings/inventory-valuation" },
                    { 6101, false, "Settings.InventoryValuation.Edit", 6100, "تغییر تنظیمات ارزش‌گذاری", null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_inventory_cost_balances_CompanyId_ProductId_WarehouseId",
                schema: "inventory",
                table: "inventory_cost_balances",
                columns: new[] { "CompanyId", "ProductId", "WarehouseId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_inventory_cost_balances_ProductId",
                schema: "inventory",
                table: "inventory_cost_balances",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_inventory_cost_balances_WarehouseId",
                schema: "inventory",
                table: "inventory_cost_balances",
                column: "WarehouseId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "inventory_cost_balances",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "valuation_settings",
                schema: "inventory");

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3305);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 6101);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 6100);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 6000);

            migrationBuilder.DropColumn(
                name: "TotalCost",
                schema: "inventory",
                table: "InventoryTransactions");

            migrationBuilder.DropColumn(
                name: "UnitCost",
                schema: "inventory",
                table: "InventoryTransactions");

            migrationBuilder.DropColumn(
                name: "UnitCost",
                schema: "inventory",
                table: "InventoryDocDetails");
        }
    }
}
