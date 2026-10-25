using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWarehouseUserAccess : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WarehouseUserAccesses",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WarehouseId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WarehouseUserAccesses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WarehouseUserAccesses_Warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalSchema: "inventory",
                        principalTable: "Warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                schema: "security",
                table: "permissions",
                columns: new[] { "Id", "IsMenu", "Name", "ParentId", "Title", "Url" },
                values: new object[] { 3107, false, "Inventory.Warehouses.Access", 3101, "تعیین کاربران مجاز انبار", null });

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseUserAccesses_UserId_WarehouseId",
                schema: "inventory",
                table: "WarehouseUserAccesses",
                columns: new[] { "UserId", "WarehouseId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseUserAccesses_WarehouseId",
                schema: "inventory",
                table: "WarehouseUserAccesses",
                column: "WarehouseId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WarehouseUserAccesses",
                schema: "inventory");

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 3107);
        }
    }
}
