using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERPDotNet.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUsageToBomHeaderAndChangeVersionToInt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ProductId",
                table: "WhereUsedRecursiveResult",
                newName: "ParentProductId");

            migrationBuilder.RenameColumn(
                name: "BomHeaderId",
                table: "WhereUsedRecursiveResult",
                newName: "BomVersion");

            migrationBuilder.AddColumn<int>(
                name: "BomId",
                table: "WhereUsedRecursiveResult",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "BomStatusId",
                table: "WhereUsedRecursiveResult",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "BomTitle",
                table: "WhereUsedRecursiveResult",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "BomUsageId",
                table: "WhereUsedRecursiveResult",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ParentProductCode",
                table: "WhereUsedRecursiveResult",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ParentProductName",
                table: "WhereUsedRecursiveResult",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "UnitName",
                table: "WhereUsedRecursiveResult",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<int>(
                name: "Version",
                schema: "eng",
                table: "bom_headers",
                type: "int",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20);

            migrationBuilder.AddColumn<int>(
                name: "Usage",
                schema: "eng",
                table: "bom_headers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_bom_headers_ProductId",
                schema: "eng",
                table: "bom_headers",
                column: "ProductId",
                unique: true,
                filter: "[Usage] = 1 AND [IsDeleted] = 0 AND [IsActive] = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_bom_headers_ProductId",
                schema: "eng",
                table: "bom_headers");

            migrationBuilder.DropColumn(
                name: "BomId",
                table: "WhereUsedRecursiveResult");

            migrationBuilder.DropColumn(
                name: "BomStatusId",
                table: "WhereUsedRecursiveResult");

            migrationBuilder.DropColumn(
                name: "BomTitle",
                table: "WhereUsedRecursiveResult");

            migrationBuilder.DropColumn(
                name: "BomUsageId",
                table: "WhereUsedRecursiveResult");

            migrationBuilder.DropColumn(
                name: "ParentProductCode",
                table: "WhereUsedRecursiveResult");

            migrationBuilder.DropColumn(
                name: "ParentProductName",
                table: "WhereUsedRecursiveResult");

            migrationBuilder.DropColumn(
                name: "UnitName",
                table: "WhereUsedRecursiveResult");

            migrationBuilder.DropColumn(
                name: "Usage",
                schema: "eng",
                table: "bom_headers");

            migrationBuilder.RenameColumn(
                name: "ParentProductId",
                table: "WhereUsedRecursiveResult",
                newName: "ProductId");

            migrationBuilder.RenameColumn(
                name: "BomVersion",
                table: "WhereUsedRecursiveResult",
                newName: "BomHeaderId");

            migrationBuilder.AlterColumn<string>(
                name: "Version",
                schema: "eng",
                table: "bom_headers",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");
        }
    }
}
