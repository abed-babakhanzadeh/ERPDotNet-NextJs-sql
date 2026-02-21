using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddIsActiveToBpmsTransition : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                schema: "workflow",
                table: "BpmsTransitions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<string>(
                name: "VariablesJson",
                schema: "workflow",
                table: "BpmsInstances",
                type: "NVARCHAR(MAX)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "NVARCHAR(MAX)",
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BpmsProcessVersionId",
                schema: "workflow",
                table: "BpmsInstances",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_BpmsInstances_BpmsProcessVersionId",
                schema: "workflow",
                table: "BpmsInstances",
                column: "BpmsProcessVersionId");

            migrationBuilder.AddForeignKey(
                name: "FK_BpmsInstances_BpmsProcessVersions_BpmsProcessVersionId",
                schema: "workflow",
                table: "BpmsInstances",
                column: "BpmsProcessVersionId",
                principalSchema: "workflow",
                principalTable: "BpmsProcessVersions",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BpmsInstances_BpmsProcessVersions_BpmsProcessVersionId",
                schema: "workflow",
                table: "BpmsInstances");

            migrationBuilder.DropIndex(
                name: "IX_BpmsInstances_BpmsProcessVersionId",
                schema: "workflow",
                table: "BpmsInstances");

            migrationBuilder.DropColumn(
                name: "IsActive",
                schema: "workflow",
                table: "BpmsTransitions");

            migrationBuilder.DropColumn(
                name: "BpmsProcessVersionId",
                schema: "workflow",
                table: "BpmsInstances");

            migrationBuilder.AlterColumn<string>(
                name: "VariablesJson",
                schema: "workflow",
                table: "BpmsInstances",
                type: "NVARCHAR(MAX)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "NVARCHAR(MAX)");
        }
    }
}
