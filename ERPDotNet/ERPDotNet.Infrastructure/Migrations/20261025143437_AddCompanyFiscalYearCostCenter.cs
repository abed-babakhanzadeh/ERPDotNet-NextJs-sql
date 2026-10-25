using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ERPDotNet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanyFiscalYearCostCenter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "companies",
                schema: "base",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    NationalId = table.Column<string>(type: "nvarchar(11)", maxLength: 11, nullable: true),
                    EconomicCode = table.Column<string>(type: "nvarchar(14)", maxLength: 14, nullable: true),
                    RegistrationNumber = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
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
                    table.PrimaryKey("PK_companies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "cost_centers",
                schema: "base",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    ParentId = table.Column<int>(type: "int", nullable: true),
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
                    table.PrimaryKey("PK_cost_centers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cost_centers_cost_centers_ParentId",
                        column: x => x.ParentId,
                        principalSchema: "base",
                        principalTable: "cost_centers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "fiscal_years",
                schema: "base",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CompanyId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fiscal_years", x => x.Id);
                    table.ForeignKey(
                        name: "FK_fiscal_years_companies_CompanyId",
                        column: x => x.CompanyId,
                        principalSchema: "base",
                        principalTable: "companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "security",
                table: "permissions",
                columns: new[] { "Id", "IsMenu", "Name", "ParentId", "Title", "Url" },
                values: new object[,]
                {
                    { 39, true, "BaseInfo.Companies", 30, "شرکت‌ها", "/base-info/companies" },
                    { 43, true, "BaseInfo.FiscalYears", 30, "سال‌های مالی", "/base-info/fiscal-years" },
                    { 47, true, "BaseInfo.CostCenters", 30, "مراکز هزینه", "/base-info/cost-centers" },
                    { 40, false, "BaseInfo.Companies.Create", 39, "تعریف شرکت", null },
                    { 41, false, "BaseInfo.Companies.Edit", 39, "ویرایش شرکت", null },
                    { 42, false, "BaseInfo.Companies.Delete", 39, "حذف شرکت", null },
                    { 44, false, "BaseInfo.FiscalYears.Create", 43, "تعریف سال مالی", null },
                    { 45, false, "BaseInfo.FiscalYears.Edit", 43, "ویرایش و بستن سال مالی", null },
                    { 46, false, "BaseInfo.FiscalYears.Delete", 43, "حذف سال مالی", null },
                    { 48, false, "BaseInfo.CostCenters.Create", 47, "تعریف مرکز هزینه", null },
                    { 49, false, "BaseInfo.CostCenters.Edit", 47, "ویرایش مرکز هزینه", null },
                    { 50, false, "BaseInfo.CostCenters.Delete", 47, "حذف مرکز هزینه", null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Warehouses_CompanyId",
                schema: "inventory",
                table: "Warehouses",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryDocHeaders_FiscalYearId",
                schema: "inventory",
                table: "InventoryDocHeaders",
                column: "FiscalYearId");

            migrationBuilder.CreateIndex(
                name: "IX_companies_Code",
                schema: "base",
                table: "companies",
                column: "Code",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_cost_centers_Code",
                schema: "base",
                table: "cost_centers",
                column: "Code",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_cost_centers_ParentId",
                schema: "base",
                table: "cost_centers",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_fiscal_years_CompanyId_StartDate",
                schema: "base",
                table: "fiscal_years",
                columns: new[] { "CompanyId", "StartDate" });

            migrationBuilder.CreateIndex(
                name: "IX_fiscal_years_CompanyId_Title",
                schema: "base",
                table: "fiscal_years",
                columns: new[] { "CompanyId", "Title" },
                unique: true,
                filter: "[IsDeleted] = 0");

            // پیش از این مهاجرت جدول شرکت و سال مالی وجود نداشت؛ مقادیر قبلی این ستون‌ها به هیچ رکوردی اشاره نمی‌کنند
            migrationBuilder.Sql("UPDATE [inventory].[InventoryDocHeaders] SET [FiscalYearId] = NULL WHERE [FiscalYearId] IS NOT NULL;");
            migrationBuilder.Sql("UPDATE [inventory].[Warehouses] SET [CompanyId] = NULL WHERE [CompanyId] IS NOT NULL;");

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryDocHeaders_fiscal_years_FiscalYearId",
                schema: "inventory",
                table: "InventoryDocHeaders",
                column: "FiscalYearId",
                principalSchema: "base",
                principalTable: "fiscal_years",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Warehouses_companies_CompanyId",
                schema: "inventory",
                table: "Warehouses",
                column: "CompanyId",
                principalSchema: "base",
                principalTable: "companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryDocHeaders_fiscal_years_FiscalYearId",
                schema: "inventory",
                table: "InventoryDocHeaders");

            migrationBuilder.DropForeignKey(
                name: "FK_Warehouses_companies_CompanyId",
                schema: "inventory",
                table: "Warehouses");

            migrationBuilder.DropTable(
                name: "cost_centers",
                schema: "base");

            migrationBuilder.DropTable(
                name: "fiscal_years",
                schema: "base");

            migrationBuilder.DropTable(
                name: "companies",
                schema: "base");

            migrationBuilder.DropIndex(
                name: "IX_Warehouses_CompanyId",
                schema: "inventory",
                table: "Warehouses");

            migrationBuilder.DropIndex(
                name: "IX_InventoryDocHeaders_FiscalYearId",
                schema: "inventory",
                table: "InventoryDocHeaders");

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 40);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 41);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 42);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 44);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 45);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 46);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 48);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 49);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 50);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 39);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 43);

            migrationBuilder.DeleteData(
                schema: "security",
                table: "permissions",
                keyColumn: "Id",
                keyValue: 47);
        }
    }
}
