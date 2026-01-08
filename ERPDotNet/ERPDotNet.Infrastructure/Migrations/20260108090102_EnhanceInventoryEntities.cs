using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EnhanceInventoryEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ParentId",
                schema: "inventory",
                table: "Locations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                schema: "inventory",
                table: "InventoryBatches",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupplierBatchCode",
                schema: "inventory",
                table: "InventoryBatches",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DocumentSequences",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DocTypeId = table.Column<int>(type: "int", nullable: false),
                    FiscalYearId = table.Column<int>(type: "int", nullable: true),
                    LastValue = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentSequences", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Locations_ParentId",
                schema: "inventory",
                table: "Locations",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentSequences_DocTypeId_FiscalYearId",
                table: "DocumentSequences",
                columns: new[] { "DocTypeId", "FiscalYearId" },
                unique: true,
                filter: "[FiscalYearId] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Locations_Locations_ParentId",
                schema: "inventory",
                table: "Locations",
                column: "ParentId",
                principalSchema: "inventory",
                principalTable: "Locations",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Locations_Locations_ParentId",
                schema: "inventory",
                table: "Locations");

            migrationBuilder.DropTable(
                name: "DocumentSequences");

            migrationBuilder.DropIndex(
                name: "IX_Locations_ParentId",
                schema: "inventory",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "ParentId",
                schema: "inventory",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "Description",
                schema: "inventory",
                table: "InventoryBatches");

            migrationBuilder.DropColumn(
                name: "SupplierBatchCode",
                schema: "inventory",
                table: "InventoryBatches");
        }
    }
}
