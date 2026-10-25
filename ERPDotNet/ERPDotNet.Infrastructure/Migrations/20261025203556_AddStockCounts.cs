using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStockCounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StockCounts",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WarehouseId = table.Column<int>(type: "int", nullable: false),
                    CountDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SurplusDocId = table.Column<long>(type: "bigint", nullable: true),
                    ShortageDocId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockCounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StockCounts_Warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalSchema: "inventory",
                        principalTable: "Warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StockCountLines",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StockCountId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    LocationId = table.Column<int>(type: "int", nullable: true),
                    BatchId = table.Column<int>(type: "int", nullable: true),
                    SystemQuantity = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    CountedQuantity = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockCountLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StockCountLines_InventoryBatches_BatchId",
                        column: x => x.BatchId,
                        principalSchema: "inventory",
                        principalTable: "InventoryBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StockCountLines_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StockCountLines_StockCounts_StockCountId",
                        column: x => x.StockCountId,
                        principalSchema: "inventory",
                        principalTable: "StockCounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StockCountLines_products_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "base",
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "security",
                table: "permissions",
                columns: new[] { "Id", "IsMenu", "Name", "ParentId", "Title", "Url" },
                values: new object[,]
                {
                    { 3210, true, "Inventory.StockCounts", 3200, "انبارگردانی", "/inventory/stock-counts" },
                    { 3211, false, "Inventory.StockCounts.View", 3210, "مشاهده انبارگردانی", null },
                    { 3212, false, "Inventory.StockCounts.Create", 3210, "شروع انبارگردانی", null },
                    { 3213, false, "Inventory.StockCounts.Edit", 3210, "ثبت شمارش", null },
                    { 3214, false, "Inventory.StockCounts.Finalize", 3210, "نهایی کردن و صدور اسناد اصلاحی", null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_StockCountLines_BatchId",
                schema: "inventory",
                table: "StockCountLines",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_StockCountLines_LocationId",
                schema: "inventory",
                table: "StockCountLines",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_StockCountLines_ProductId",
                schema: "inventory",
                table: "StockCountLines",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_StockCountLines_StockCountId",
                schema: "inventory",
                table: "StockCountLines",
                column: "StockCountId");

            migrationBuilder.CreateIndex(
                name: "IX_StockCounts_WarehouseId_Status",
                schema: "inventory",
                table: "StockCounts",
                columns: new[] { "WarehouseId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StockCountLines",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "StockCounts",
                schema: "inventory");

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3211);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3212);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3213);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3214);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3210);
        }
    }
}
