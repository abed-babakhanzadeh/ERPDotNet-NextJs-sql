using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Tier0RefinementsFixed1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_CurrentStocks_BatchId",
                schema: "inventory",
                table: "CurrentStocks",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_CurrentStocks_LocationId",
                schema: "inventory",
                table: "CurrentStocks",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_CurrentStocks_ProductId",
                schema: "inventory",
                table: "CurrentStocks",
                column: "ProductId");

            migrationBuilder.AddForeignKey(
                name: "FK_CurrentStocks_InventoryBatches_BatchId",
                schema: "inventory",
                table: "CurrentStocks",
                column: "BatchId",
                principalSchema: "inventory",
                principalTable: "InventoryBatches",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CurrentStocks_Locations_LocationId",
                schema: "inventory",
                table: "CurrentStocks",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CurrentStocks_Warehouses_WarehouseId",
                schema: "inventory",
                table: "CurrentStocks",
                column: "WarehouseId",
                principalSchema: "inventory",
                principalTable: "Warehouses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CurrentStocks_products_ProductId",
                schema: "inventory",
                table: "CurrentStocks",
                column: "ProductId",
                principalSchema: "base",
                principalTable: "products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CurrentStocks_InventoryBatches_BatchId",
                schema: "inventory",
                table: "CurrentStocks");

            migrationBuilder.DropForeignKey(
                name: "FK_CurrentStocks_Locations_LocationId",
                schema: "inventory",
                table: "CurrentStocks");

            migrationBuilder.DropForeignKey(
                name: "FK_CurrentStocks_Warehouses_WarehouseId",
                schema: "inventory",
                table: "CurrentStocks");

            migrationBuilder.DropForeignKey(
                name: "FK_CurrentStocks_products_ProductId",
                schema: "inventory",
                table: "CurrentStocks");

            migrationBuilder.DropIndex(
                name: "IX_CurrentStocks_BatchId",
                schema: "inventory",
                table: "CurrentStocks");

            migrationBuilder.DropIndex(
                name: "IX_CurrentStocks_LocationId",
                schema: "inventory",
                table: "CurrentStocks");

            migrationBuilder.DropIndex(
                name: "IX_CurrentStocks_ProductId",
                schema: "inventory",
                table: "CurrentStocks");
        }
    }
}
