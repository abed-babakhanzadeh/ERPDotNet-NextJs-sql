using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddInventorySerials : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "InventoryDocDetailSerials",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DocDetailId = table.Column<long>(type: "bigint", nullable: false),
                    SerialNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryDocDetailSerials", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryDocDetailSerials_InventoryDocDetails_DocDetailId",
                        column: x => x.DocDetailId,
                        principalSchema: "inventory",
                        principalTable: "InventoryDocDetails",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "InventorySerials",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    SerialNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    WarehouseId = table.Column<int>(type: "int", nullable: true),
                    LocationId = table.Column<int>(type: "int", nullable: true),
                    LastDocHeaderId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventorySerials", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventorySerials_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventorySerials_Warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalSchema: "inventory",
                        principalTable: "Warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventorySerials_products_ProductId",
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
                values: new object[] { 3304, true, "Inventory.Reports.Serials", 3300, "شماره سریال‌ها", "/inventory/reports/serials" });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryDocDetailSerials_DocDetailId_SerialNumber",
                schema: "inventory",
                table: "InventoryDocDetailSerials",
                columns: new[] { "DocDetailId", "SerialNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InventoryDocDetailSerials_SerialNumber",
                schema: "inventory",
                table: "InventoryDocDetailSerials",
                column: "SerialNumber");

            migrationBuilder.CreateIndex(
                name: "IX_InventorySerials_LocationId",
                schema: "inventory",
                table: "InventorySerials",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_InventorySerials_ProductId_SerialNumber",
                schema: "inventory",
                table: "InventorySerials",
                columns: new[] { "ProductId", "SerialNumber" },
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_InventorySerials_WarehouseId_ProductId_Status",
                schema: "inventory",
                table: "InventorySerials",
                columns: new[] { "WarehouseId", "ProductId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InventoryDocDetailSerials",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "InventorySerials",
                schema: "inventory");

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3304);
        }
    }
}
