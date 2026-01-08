using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Tier0RefinementsFixed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ItemWarehouseSettings_InventoryItemProfiles_InventoryItemProfileId1",
                schema: "inventory",
                table: "ItemWarehouseSettings");

            migrationBuilder.DropIndex(
                name: "IX_ItemWarehouseSettings_InventoryItemProfileId1",
                schema: "inventory",
                table: "ItemWarehouseSettings");

            migrationBuilder.DropColumn(
                name: "InventoryItemProfileId1",
                schema: "inventory",
                table: "ItemWarehouseSettings");

            migrationBuilder.AlterColumn<decimal>(
                name: "ReorderPoint",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                type: "decimal(18,3)",
                precision: 18,
                scale: 3,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AlterColumn<decimal>(
                name: "MinStock",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                type: "decimal(18,3)",
                precision: 18,
                scale: 3,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AlterColumn<decimal>(
                name: "MaxStock",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                type: "decimal(18,3)",
                precision: 18,
                scale: 3,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "ReorderPoint",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                type: "decimal(18,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,3)",
                oldPrecision: 18,
                oldScale: 3);

            migrationBuilder.AlterColumn<decimal>(
                name: "MinStock",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                type: "decimal(18,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,3)",
                oldPrecision: 18,
                oldScale: 3);

            migrationBuilder.AlterColumn<decimal>(
                name: "MaxStock",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                type: "decimal(18,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,3)",
                oldPrecision: 18,
                oldScale: 3);

            migrationBuilder.AddColumn<int>(
                name: "InventoryItemProfileId1",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ItemWarehouseSettings_InventoryItemProfileId1",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                column: "InventoryItemProfileId1");

            migrationBuilder.AddForeignKey(
                name: "FK_ItemWarehouseSettings_InventoryItemProfiles_InventoryItemProfileId1",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                column: "InventoryItemProfileId1",
                principalSchema: "inventory",
                principalTable: "InventoryItemProfiles",
                principalColumn: "Id");
        }
    }
}
