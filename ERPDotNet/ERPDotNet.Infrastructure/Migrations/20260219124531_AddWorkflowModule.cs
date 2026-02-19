using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkflowModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "workflow");

            migrationBuilder.CreateTable(
                name: "BpmsProcesses",
                schema: "workflow",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CompanyId = table.Column<int>(type: "int", nullable: false),
                    ProcessCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    TargetEntityName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
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
                    table.PrimaryKey("PK_BpmsProcesses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BpmsProcessVersions",
                schema: "workflow",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProcessId = table.Column<int>(type: "int", nullable: false),
                    VersionNumber = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    DesignerJson = table.Column<string>(type: "NVARCHAR(MAX)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BpmsProcessVersions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BpmsProcessVersions_BpmsProcesses_ProcessId",
                        column: x => x.ProcessId,
                        principalSchema: "workflow",
                        principalTable: "BpmsProcesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BpmsStates",
                schema: "workflow",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProcessVersionId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    StateCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BpmsStates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BpmsStates_BpmsProcessVersions_ProcessVersionId",
                        column: x => x.ProcessVersionId,
                        principalSchema: "workflow",
                        principalTable: "BpmsProcessVersions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BpmsInstances",
                schema: "workflow",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CompanyId = table.Column<int>(type: "int", nullable: false),
                    ProcessVersionId = table.Column<int>(type: "int", nullable: false),
                    TargetRecordId = table.Column<long>(type: "bigint", nullable: false),
                    CurrentStateId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    VariablesJson = table.Column<string>(type: "NVARCHAR(MAX)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BpmsInstances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BpmsInstances_BpmsProcessVersions_ProcessVersionId",
                        column: x => x.ProcessVersionId,
                        principalSchema: "workflow",
                        principalTable: "BpmsProcessVersions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BpmsInstances_BpmsStates_CurrentStateId",
                        column: x => x.CurrentStateId,
                        principalSchema: "workflow",
                        principalTable: "BpmsStates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BpmsTransitions",
                schema: "workflow",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProcessVersionId = table.Column<int>(type: "int", nullable: false),
                    FromStateId = table.Column<int>(type: "int", nullable: false),
                    ToStateId = table.Column<int>(type: "int", nullable: false),
                    ActionTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ActionCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BpmsTransitions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BpmsTransitions_BpmsProcessVersions_ProcessVersionId",
                        column: x => x.ProcessVersionId,
                        principalSchema: "workflow",
                        principalTable: "BpmsProcessVersions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BpmsTransitions_BpmsStates_FromStateId",
                        column: x => x.FromStateId,
                        principalSchema: "workflow",
                        principalTable: "BpmsStates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BpmsTransitions_BpmsStates_ToStateId",
                        column: x => x.ToStateId,
                        principalSchema: "workflow",
                        principalTable: "BpmsStates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BpmsHistories",
                schema: "workflow",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InstanceId = table.Column<long>(type: "bigint", nullable: false),
                    ActionTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    FromStateId = table.Column<int>(type: "int", nullable: false),
                    ToStateId = table.Column<int>(type: "int", nullable: false),
                    PerformedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BpmsHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BpmsHistories_BpmsInstances_InstanceId",
                        column: x => x.InstanceId,
                        principalSchema: "workflow",
                        principalTable: "BpmsInstances",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BpmsHistories_BpmsStates_FromStateId",
                        column: x => x.FromStateId,
                        principalSchema: "workflow",
                        principalTable: "BpmsStates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BpmsHistories_BpmsStates_ToStateId",
                        column: x => x.ToStateId,
                        principalSchema: "workflow",
                        principalTable: "BpmsStates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BpmsTasks",
                schema: "workflow",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CompanyId = table.Column<int>(type: "int", nullable: false),
                    InstanceId = table.Column<long>(type: "bigint", nullable: false),
                    StateId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    SummaryJson = table.Column<string>(type: "NVARCHAR(MAX)", nullable: true),
                    AssigneeUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    AssigneeRole = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsCompleted = table.Column<bool>(type: "bit", nullable: false),
                    CompletedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BpmsTasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BpmsTasks_BpmsInstances_InstanceId",
                        column: x => x.InstanceId,
                        principalSchema: "workflow",
                        principalTable: "BpmsInstances",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BpmsTasks_BpmsStates_StateId",
                        column: x => x.StateId,
                        principalSchema: "workflow",
                        principalTable: "BpmsStates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BpmsTransitionRoles",
                schema: "workflow",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TransitionId = table.Column<int>(type: "int", nullable: false),
                    RoleId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BpmsTransitionRoles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BpmsTransitionRoles_BpmsTransitions_TransitionId",
                        column: x => x.TransitionId,
                        principalSchema: "workflow",
                        principalTable: "BpmsTransitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BpmsTransitionRules",
                schema: "workflow",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TransitionId = table.Column<int>(type: "int", nullable: false),
                    VariableName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Operator = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Value = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BpmsTransitionRules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BpmsTransitionRules_BpmsTransitions_TransitionId",
                        column: x => x.TransitionId,
                        principalSchema: "workflow",
                        principalTable: "BpmsTransitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BpmsHistories_FromStateId",
                schema: "workflow",
                table: "BpmsHistories",
                column: "FromStateId");

            migrationBuilder.CreateIndex(
                name: "IX_BpmsHistories_InstanceId_CreatedAt",
                schema: "workflow",
                table: "BpmsHistories",
                columns: new[] { "InstanceId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_BpmsHistories_ToStateId",
                schema: "workflow",
                table: "BpmsHistories",
                column: "ToStateId");

            migrationBuilder.CreateIndex(
                name: "IX_BpmsInstances_CompanyId_CurrentStateId",
                schema: "workflow",
                table: "BpmsInstances",
                columns: new[] { "CompanyId", "CurrentStateId" });

            migrationBuilder.CreateIndex(
                name: "IX_BpmsInstances_CompanyId_TargetRecordId",
                schema: "workflow",
                table: "BpmsInstances",
                columns: new[] { "CompanyId", "TargetRecordId" });

            migrationBuilder.CreateIndex(
                name: "IX_BpmsInstances_CurrentStateId",
                schema: "workflow",
                table: "BpmsInstances",
                column: "CurrentStateId");

            migrationBuilder.CreateIndex(
                name: "IX_BpmsInstances_ProcessVersionId",
                schema: "workflow",
                table: "BpmsInstances",
                column: "ProcessVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_BpmsProcesses_CompanyId_ProcessCode",
                schema: "workflow",
                table: "BpmsProcesses",
                columns: new[] { "CompanyId", "ProcessCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BpmsProcessVersions_ProcessId_IsActive",
                schema: "workflow",
                table: "BpmsProcessVersions",
                columns: new[] { "ProcessId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_BpmsProcessVersions_ProcessId_VersionNumber",
                schema: "workflow",
                table: "BpmsProcessVersions",
                columns: new[] { "ProcessId", "VersionNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BpmsStates_ProcessVersionId",
                schema: "workflow",
                table: "BpmsStates",
                column: "ProcessVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_BpmsTasks_CompanyId_AssigneeUserId_IsCompleted",
                schema: "workflow",
                table: "BpmsTasks",
                columns: new[] { "CompanyId", "AssigneeUserId", "IsCompleted" });

            migrationBuilder.CreateIndex(
                name: "IX_BpmsTasks_InstanceId",
                schema: "workflow",
                table: "BpmsTasks",
                column: "InstanceId");

            migrationBuilder.CreateIndex(
                name: "IX_BpmsTasks_StateId",
                schema: "workflow",
                table: "BpmsTasks",
                column: "StateId");

            migrationBuilder.CreateIndex(
                name: "IX_BpmsTransitionRoles_TransitionId",
                schema: "workflow",
                table: "BpmsTransitionRoles",
                column: "TransitionId");

            migrationBuilder.CreateIndex(
                name: "IX_BpmsTransitionRules_TransitionId",
                schema: "workflow",
                table: "BpmsTransitionRules",
                column: "TransitionId");

            migrationBuilder.CreateIndex(
                name: "IX_BpmsTransitions_ActionCode",
                schema: "workflow",
                table: "BpmsTransitions",
                column: "ActionCode");

            migrationBuilder.CreateIndex(
                name: "IX_BpmsTransitions_FromStateId",
                schema: "workflow",
                table: "BpmsTransitions",
                column: "FromStateId");

            migrationBuilder.CreateIndex(
                name: "IX_BpmsTransitions_ProcessVersionId",
                schema: "workflow",
                table: "BpmsTransitions",
                column: "ProcessVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_BpmsTransitions_ToStateId",
                schema: "workflow",
                table: "BpmsTransitions",
                column: "ToStateId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BpmsHistories",
                schema: "workflow");

            migrationBuilder.DropTable(
                name: "BpmsTasks",
                schema: "workflow");

            migrationBuilder.DropTable(
                name: "BpmsTransitionRoles",
                schema: "workflow");

            migrationBuilder.DropTable(
                name: "BpmsTransitionRules",
                schema: "workflow");

            migrationBuilder.DropTable(
                name: "BpmsInstances",
                schema: "workflow");

            migrationBuilder.DropTable(
                name: "BpmsTransitions",
                schema: "workflow");

            migrationBuilder.DropTable(
                name: "BpmsStates",
                schema: "workflow");

            migrationBuilder.DropTable(
                name: "BpmsProcessVersions",
                schema: "workflow");

            migrationBuilder.DropTable(
                name: "BpmsProcesses",
                schema: "workflow");
        }
    }
}
