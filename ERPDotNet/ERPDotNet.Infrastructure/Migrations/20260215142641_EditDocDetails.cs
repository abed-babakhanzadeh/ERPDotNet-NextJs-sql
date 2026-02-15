using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EditDocDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_InventoryDocDetails_ProductId",
                schema: "inventory",
                table: "InventoryDocDetails",
                column: "ProductId");

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryDocDetails_products_ProductId",
                schema: "inventory",
                table: "InventoryDocDetails",
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
                name: "FK_InventoryDocDetails_products_ProductId",
                schema: "inventory",
                table: "InventoryDocDetails");

            migrationBuilder.DropIndex(
                name: "IX_InventoryDocDetails_ProductId",
                schema: "inventory",
                table: "InventoryDocDetails");
        }
    }
}
