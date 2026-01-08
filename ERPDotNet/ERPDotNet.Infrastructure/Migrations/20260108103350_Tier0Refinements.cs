using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Tier0Refinements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ItemWarehouseSettings_InventoryItemProfiles_InventoryItemProfileId",
                schema: "inventory",
                table: "ItemWarehouseSettings");

            migrationBuilder.DropForeignKey(
                name: "FK_ItemWarehouseSettings_Locations_DefaultLocationId",
                schema: "inventory",
                table: "ItemWarehouseSettings");

            migrationBuilder.DropForeignKey(
                name: "FK_ItemWarehouseSettings_Warehouses_WarehouseId",
                schema: "inventory",
                table: "ItemWarehouseSettings");

            migrationBuilder.DropIndex(
                name: "IX_ItemWarehouseSettings_InventoryItemProfileId_WarehouseId",
                schema: "inventory",
                table: "ItemWarehouseSettings");

            migrationBuilder.DropIndex(
                name: "IX_ItemWarehouseSettings_WarehouseId",
                schema: "inventory",
                table: "ItemWarehouseSettings");

            migrationBuilder.RenameTable(
                name: "Locations",
                schema: "inventory",
                newName: "Locations");

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

            migrationBuilder.AddColumn<string>(
                name: "Path",
                table: "Locations",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_ItemWarehouseSettings_InventoryItemProfileId",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                column: "InventoryItemProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_ItemWarehouseSettings_InventoryItemProfileId1",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                column: "InventoryItemProfileId1");

            migrationBuilder.CreateIndex(
                name: "IX_ItemWarehouseSettings_WarehouseId_InventoryItemProfileId",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                columns: new[] { "WarehouseId", "InventoryItemProfileId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Locations_Path",
                table: "Locations",
                column: "Path");

            migrationBuilder.AddForeignKey(
                name: "FK_ItemWarehouseSettings_InventoryItemProfiles_InventoryItemProfileId",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                column: "InventoryItemProfileId",
                principalSchema: "inventory",
                principalTable: "InventoryItemProfiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ItemWarehouseSettings_InventoryItemProfiles_InventoryItemProfileId1",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                column: "InventoryItemProfileId1",
                principalSchema: "inventory",
                principalTable: "InventoryItemProfiles",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ItemWarehouseSettings_Locations_DefaultLocationId",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                column: "DefaultLocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_ItemWarehouseSettings_Warehouses_WarehouseId",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                column: "WarehouseId",
                principalSchema: "inventory",
                principalTable: "Warehouses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ItemWarehouseSettings_InventoryItemProfiles_InventoryItemProfileId",
                schema: "inventory",
                table: "ItemWarehouseSettings");

            migrationBuilder.DropForeignKey(
                name: "FK_ItemWarehouseSettings_InventoryItemProfiles_InventoryItemProfileId1",
                schema: "inventory",
                table: "ItemWarehouseSettings");

            migrationBuilder.DropForeignKey(
                name: "FK_ItemWarehouseSettings_Locations_DefaultLocationId",
                schema: "inventory",
                table: "ItemWarehouseSettings");

            migrationBuilder.DropForeignKey(
                name: "FK_ItemWarehouseSettings_Warehouses_WarehouseId",
                schema: "inventory",
                table: "ItemWarehouseSettings");

            migrationBuilder.DropIndex(
                name: "IX_ItemWarehouseSettings_InventoryItemProfileId",
                schema: "inventory",
                table: "ItemWarehouseSettings");

            migrationBuilder.DropIndex(
                name: "IX_ItemWarehouseSettings_InventoryItemProfileId1",
                schema: "inventory",
                table: "ItemWarehouseSettings");

            migrationBuilder.DropIndex(
                name: "IX_ItemWarehouseSettings_WarehouseId_InventoryItemProfileId",
                schema: "inventory",
                table: "ItemWarehouseSettings");

            migrationBuilder.DropIndex(
                name: "IX_Locations_Path",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "InventoryItemProfileId1",
                schema: "inventory",
                table: "ItemWarehouseSettings");

            migrationBuilder.DropColumn(
                name: "Path",
                table: "Locations");

            migrationBuilder.RenameTable(
                name: "Locations",
                newName: "Locations",
                newSchema: "inventory");

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

            migrationBuilder.CreateIndex(
                name: "IX_ItemWarehouseSettings_InventoryItemProfileId_WarehouseId",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                columns: new[] { "InventoryItemProfileId", "WarehouseId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ItemWarehouseSettings_WarehouseId",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                column: "WarehouseId");

            migrationBuilder.AddForeignKey(
                name: "FK_ItemWarehouseSettings_InventoryItemProfiles_InventoryItemProfileId",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                column: "InventoryItemProfileId",
                principalSchema: "inventory",
                principalTable: "InventoryItemProfiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ItemWarehouseSettings_Locations_DefaultLocationId",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                column: "DefaultLocationId",
                principalSchema: "inventory",
                principalTable: "Locations",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ItemWarehouseSettings_Warehouses_WarehouseId",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                column: "WarehouseId",
                principalSchema: "inventory",
                principalTable: "Warehouses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
