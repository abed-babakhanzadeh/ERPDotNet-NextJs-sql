using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkflowSlaDelegation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EscalationRoleId",
                schema: "workflow",
                table: "BpmsStates",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SlaHours",
                schema: "workflow",
                table: "BpmsStates",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OnBehalfOfUserId",
                schema: "workflow",
                table: "BpmsHistories",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BpmsDelegations",
                schema: "workflow",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CompanyId = table.Column<int>(type: "int", nullable: false),
                    FromUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    ToUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsRevoked = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BpmsDelegations", x => x.Id);
                });

            migrationBuilder.InsertData(
                schema: "security",
                table: "permissions",
                columns: new[] { "Id", "IsMenu", "Name", "ParentId", "Title", "Url" },
                values: new object[] { 4104, false, "Workflow.Tasks.Delegate", 4100, "تفویض اختیار کارتابل", null });

            migrationBuilder.CreateIndex(
                name: "IX_BpmsDelegations_ToUserId_EndDate",
                schema: "workflow",
                table: "BpmsDelegations",
                columns: new[] { "ToUserId", "EndDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BpmsDelegations",
                schema: "workflow");

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 4104);

            migrationBuilder.DropColumn(
                name: "EscalationRoleId",
                schema: "workflow",
                table: "BpmsStates");

            migrationBuilder.DropColumn(
                name: "SlaHours",
                schema: "workflow",
                table: "BpmsStates");

            migrationBuilder.DropColumn(
                name: "OnBehalfOfUserId",
                schema: "workflow",
                table: "BpmsHistories");
        }
    }
}
