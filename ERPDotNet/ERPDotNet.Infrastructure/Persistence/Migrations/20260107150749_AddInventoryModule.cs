using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddInventoryModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "inventory");

            migrationBuilder.CreateTable(
                name: "CurrentStocks",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WarehouseId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    LocationId = table.Column<int>(type: "int", nullable: true),
                    BatchId = table.Column<int>(type: "int", nullable: true),
                    QuantityOnHand = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    QuantityReserved = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CurrentStocks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InventoryBatches",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    BatchNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ManufactureDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ExpiryDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsBlocked = table.Column<bool>(type: "bit", nullable: false),
                    BlockReason = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryBatches", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InventoryDocTypes",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Nature = table.Column<int>(type: "int", nullable: false),
                    ParentId = table.Column<int>(type: "int", nullable: true),
                    IsReferenceRequired = table.Column<bool>(type: "bit", nullable: false),
                    RequiredPermissionName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AffectsCost = table.Column<bool>(type: "bit", nullable: false),
                    NumberingScope = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryDocTypes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryDocTypes_InventoryDocTypes_ParentId",
                        column: x => x.ParentId,
                        principalSchema: "inventory",
                        principalTable: "InventoryDocTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InventoryItemProfiles",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    IsBatchManaged = table.Column<bool>(type: "bit", nullable: false),
                    IsSerialManaged = table.Column<bool>(type: "bit", nullable: false),
                    ShelfLifeDays = table.Column<int>(type: "int", nullable: true),
                    MainInventoryUnitId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryItemProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryItemProfiles_products_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "base",
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryItemProfiles_units_MainInventoryUnitId",
                        column: x => x.MainInventoryUnitId,
                        principalSchema: "base",
                        principalTable: "units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InventoryTransactions",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FiscalYearId = table.Column<int>(type: "int", nullable: true),
                    TransactionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DocHeaderId = table.Column<long>(type: "bigint", nullable: false),
                    DocDetailId = table.Column<long>(type: "bigint", nullable: false),
                    DocTypeId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    WarehouseId = table.Column<int>(type: "int", nullable: false),
                    LocationId = table.Column<int>(type: "int", nullable: true),
                    BatchId = table.Column<int>(type: "int", nullable: true),
                    Sign = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    RelatedTransactionId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryTransactions_InventoryTransactions_RelatedTransactionId",
                        column: x => x.RelatedTransactionId,
                        principalSchema: "inventory",
                        principalTable: "InventoryTransactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Warehouses",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CompanyId = table.Column<int>(type: "int", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Warehouses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InventoryDocTypeAllowedRefs",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InventoryDocTypeId = table.Column<int>(type: "int", nullable: false),
                    ReferenceEntityName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryDocTypeAllowedRefs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryDocTypeAllowedRefs_InventoryDocTypes_InventoryDocTypeId",
                        column: x => x.InventoryDocTypeId,
                        principalSchema: "inventory",
                        principalTable: "InventoryDocTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "InventoryDocHeaders",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FiscalYearId = table.Column<int>(type: "int", nullable: true),
                    DocNumber = table.Column<long>(type: "bigint", nullable: false),
                    DocDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DocTypeId = table.Column<int>(type: "int", nullable: false),
                    WarehouseId = table.Column<int>(type: "int", nullable: false),
                    DestinationWarehouseId = table.Column<int>(type: "int", nullable: true),
                    ReferenceEntityName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ReferenceEntityId = table.Column<long>(type: "bigint", nullable: true),
                    ReferenceExternalCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    TargetPartyType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    TargetPartyId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    TargetPartyName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryDocHeaders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryDocHeaders_InventoryDocTypes_DocTypeId",
                        column: x => x.DocTypeId,
                        principalSchema: "inventory",
                        principalTable: "InventoryDocTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryDocHeaders_Warehouses_DestinationWarehouseId",
                        column: x => x.DestinationWarehouseId,
                        principalSchema: "inventory",
                        principalTable: "Warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryDocHeaders_Warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalSchema: "inventory",
                        principalTable: "Warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Locations",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WarehouseId = table.Column<int>(type: "int", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsBlocked = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Locations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Locations_Warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalSchema: "inventory",
                        principalTable: "Warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InventoryDocDetails",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    HeaderId = table.Column<long>(type: "bigint", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    MainUnitQuantity = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    SubUnitQuantity = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    SubUnitId = table.Column<int>(type: "int", nullable: true),
                    LocationId = table.Column<int>(type: "int", nullable: true),
                    BatchId = table.Column<int>(type: "int", nullable: true),
                    ReferenceEntityName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ReferenceEntityLineId = table.Column<long>(type: "bigint", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryDocDetails", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryDocDetails_InventoryBatches_BatchId",
                        column: x => x.BatchId,
                        principalSchema: "inventory",
                        principalTable: "InventoryBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryDocDetails_InventoryDocHeaders_HeaderId",
                        column: x => x.HeaderId,
                        principalSchema: "inventory",
                        principalTable: "InventoryDocHeaders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InventoryDocDetails_Locations_LocationId",
                        column: x => x.LocationId,
                        principalSchema: "inventory",
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ItemWarehouseSettings",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InventoryItemProfileId = table.Column<int>(type: "int", nullable: false),
                    WarehouseId = table.Column<int>(type: "int", nullable: false),
                    MinStock = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    MaxStock = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    ReorderPoint = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    DefaultLocationId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItemWarehouseSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItemWarehouseSettings_InventoryItemProfiles_InventoryItemProfileId",
                        column: x => x.InventoryItemProfileId,
                        principalSchema: "inventory",
                        principalTable: "InventoryItemProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ItemWarehouseSettings_Locations_DefaultLocationId",
                        column: x => x.DefaultLocationId,
                        principalSchema: "inventory",
                        principalTable: "Locations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ItemWarehouseSettings_Warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalSchema: "inventory",
                        principalTable: "Warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CurrentStocks_WarehouseId_ProductId_LocationId_BatchId",
                schema: "inventory",
                table: "CurrentStocks",
                columns: new[] { "WarehouseId", "ProductId", "LocationId", "BatchId" },
                unique: true,
                filter: "[LocationId] IS NOT NULL AND [BatchId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryBatches_ProductId_BatchNumber",
                schema: "inventory",
                table: "InventoryBatches",
                columns: new[] { "ProductId", "BatchNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InventoryDocDetails_BatchId",
                schema: "inventory",
                table: "InventoryDocDetails",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryDocDetails_HeaderId",
                schema: "inventory",
                table: "InventoryDocDetails",
                column: "HeaderId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryDocDetails_LocationId",
                schema: "inventory",
                table: "InventoryDocDetails",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryDocHeaders_DestinationWarehouseId",
                schema: "inventory",
                table: "InventoryDocHeaders",
                column: "DestinationWarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryDocHeaders_DocNumber",
                schema: "inventory",
                table: "InventoryDocHeaders",
                column: "DocNumber");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryDocHeaders_DocNumber_FiscalYearId",
                schema: "inventory",
                table: "InventoryDocHeaders",
                columns: new[] { "DocNumber", "FiscalYearId" });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryDocHeaders_DocTypeId",
                schema: "inventory",
                table: "InventoryDocHeaders",
                column: "DocTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryDocHeaders_WarehouseId",
                schema: "inventory",
                table: "InventoryDocHeaders",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryDocTypeAllowedRefs_InventoryDocTypeId",
                schema: "inventory",
                table: "InventoryDocTypeAllowedRefs",
                column: "InventoryDocTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryDocTypes_ParentId",
                schema: "inventory",
                table: "InventoryDocTypes",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItemProfiles_MainInventoryUnitId",
                schema: "inventory",
                table: "InventoryItemProfiles",
                column: "MainInventoryUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItemProfiles_ProductId",
                schema: "inventory",
                table: "InventoryItemProfiles",
                column: "ProductId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InventoryTransactions_ProductId_TransactionDate",
                schema: "inventory",
                table: "InventoryTransactions",
                columns: new[] { "ProductId", "TransactionDate" });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryTransactions_RelatedTransactionId",
                schema: "inventory",
                table: "InventoryTransactions",
                column: "RelatedTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryTransactions_TransactionDate",
                schema: "inventory",
                table: "InventoryTransactions",
                column: "TransactionDate");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryTransactions_WarehouseId_ProductId",
                schema: "inventory",
                table: "InventoryTransactions",
                columns: new[] { "WarehouseId", "ProductId" });

            migrationBuilder.CreateIndex(
                name: "IX_ItemWarehouseSettings_DefaultLocationId",
                schema: "inventory",
                table: "ItemWarehouseSettings",
                column: "DefaultLocationId");

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

            migrationBuilder.CreateIndex(
                name: "IX_Locations_WarehouseId_Code",
                schema: "inventory",
                table: "Locations",
                columns: new[] { "WarehouseId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Warehouses_Code",
                schema: "inventory",
                table: "Warehouses",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CurrentStocks",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "InventoryDocDetails",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "InventoryDocTypeAllowedRefs",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "InventoryTransactions",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "ItemWarehouseSettings",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "InventoryBatches",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "InventoryDocHeaders",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "InventoryItemProfiles",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "Locations",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "InventoryDocTypes",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "Warehouses",
                schema: "inventory");
        }
    }
}
