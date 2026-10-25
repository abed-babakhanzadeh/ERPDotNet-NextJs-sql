using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTransferDestinationLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DestinationLocationId",
                schema: "inventory",
                table: "InventoryDocDetails",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_InventoryDocDetails_DestinationLocationId",
                schema: "inventory",
                table: "InventoryDocDetails",
                column: "DestinationLocationId");

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryDocDetails_Locations_DestinationLocationId",
                schema: "inventory",
                table: "InventoryDocDetails",
                column: "DestinationLocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryDocDetails_Locations_DestinationLocationId",
                schema: "inventory",
                table: "InventoryDocDetails");

            migrationBuilder.DropIndex(
                name: "IX_InventoryDocDetails_DestinationLocationId",
                schema: "inventory",
                table: "InventoryDocDetails");

            migrationBuilder.DropColumn(
                name: "DestinationLocationId",
                schema: "inventory",
                table: "InventoryDocDetails");
        }
    }
}
