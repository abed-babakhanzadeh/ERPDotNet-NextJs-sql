using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFifoCostLayers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "inventory_cost_layers",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CompanyId = table.Column<int>(type: "int", nullable: true),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    WarehouseId = table.Column<int>(type: "int", nullable: true),
                    SourceTransactionId = table.Column<long>(type: "bigint", nullable: true),
                    UnitCost = table.Column<decimal>(type: "decimal(18,6)", precision: 18, scale: 6, nullable: false),
                    OriginalQuantity = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    RemainingQuantity = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inventory_cost_layers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_inventory_cost_layers_InventoryTransactions_SourceTransactionId",
                        column: x => x.SourceTransactionId,
                        principalSchema: "inventory",
                        principalTable: "InventoryTransactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_inventory_cost_layers_Warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalSchema: "inventory",
                        principalTable: "Warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_inventory_cost_layers_products_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "base",
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "inventory_cost_layer_consumptions",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LayerId = table.Column<long>(type: "bigint", nullable: false),
                    TransactionId = table.Column<long>(type: "bigint", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    Cost = table.Column<decimal>(type: "decimal(20,4)", precision: 20, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inventory_cost_layer_consumptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_inventory_cost_layer_consumptions_InventoryTransactions_TransactionId",
                        column: x => x.TransactionId,
                        principalSchema: "inventory",
                        principalTable: "InventoryTransactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_inventory_cost_layer_consumptions_inventory_cost_layers_LayerId",
                        column: x => x.LayerId,
                        principalSchema: "inventory",
                        principalTable: "inventory_cost_layers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_inventory_cost_layer_consumptions_LayerId",
                schema: "inventory",
                table: "inventory_cost_layer_consumptions",
                column: "LayerId");

            migrationBuilder.CreateIndex(
                name: "IX_inventory_cost_layer_consumptions_TransactionId",
                schema: "inventory",
                table: "inventory_cost_layer_consumptions",
                column: "TransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_inventory_cost_layers_ProductId_CompanyId_WarehouseId_RemainingQuantity",
                schema: "inventory",
                table: "inventory_cost_layers",
                columns: new[] { "ProductId", "CompanyId", "WarehouseId", "RemainingQuantity" });

            migrationBuilder.CreateIndex(
                name: "IX_inventory_cost_layers_SourceTransactionId",
                schema: "inventory",
                table: "inventory_cost_layers",
                column: "SourceTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_inventory_cost_layers_WarehouseId",
                schema: "inventory",
                table: "inventory_cost_layers",
                column: "WarehouseId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "inventory_cost_layer_consumptions",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "inventory_cost_layers",
                schema: "inventory");
        }
    }
}
