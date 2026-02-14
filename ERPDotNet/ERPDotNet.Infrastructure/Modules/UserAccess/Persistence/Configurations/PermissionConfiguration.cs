using ERPDotNet.Domain.Modules.UserAccess.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.UserAccess.Persistence.Configurations;

public class PermissionConfiguration : IEntityTypeConfiguration<Permission>
{
    public void Configure(EntityTypeBuilder<Permission> builder)
    {
        builder.ToTable("permissions", "security");

        // تنظیم رابطه پدر-فرزندی
        builder.HasOne(p => p.Parent)
               .WithMany(p => p.Children)
               .HasForeignKey(p => p.ParentId)
               .OnDelete(DeleteBehavior.Restrict);

        // === Seed Data ===
        builder.HasData(
            // 1-ریشه اصلی
            new Permission { Id = 1, Name = "System", Title = "سیستم", IsMenu = false, ParentId = null },
            
            // ===  ماژول عمومی ===
            new Permission { Id = 100, Name = "General", Title = "عمومی", IsMenu = true, ParentId = 1 },
            
            // 2- ماژول مدیریت کاربران
            new Permission { Id = 2, Name = "UserAccess", Title = "مدیریت کاربران", IsMenu = true, ParentId = 100, Url = "/users" },
            new Permission { Id = 3, Name = "UserAccess.View", Title = "مشاهده لیست", IsMenu = false, ParentId = 2 },
            new Permission { Id = 4, Name = "UserAccess.Create", Title = "افزودن کاربر", IsMenu = false, ParentId = 2 },
            new Permission { Id = 5, Name = "UserAccess.Edit", Title = "ویرایش کاربر", IsMenu = false, ParentId = 2 },
            new Permission { Id = 6, Name = "UserAccess.Delete", Title = "حذف کاربر", IsMenu = false, ParentId = 2 },

            // === 3- مدیریت نقش‌ها ===
            new Permission { Id = 7, Name = "UserAccess.Roles", Title = "مدیریت نقش‌ها", IsMenu = true, ParentId = 100, Url = "/roles" },
            new Permission { Id = 8, Name = "UserAccess.Roles.Create", Title = "تعریف نقش", IsMenu = false, ParentId = 7 },
            new Permission { Id = 9, Name = "UserAccess.Roles.Delete", Title = "حذف نقش", IsMenu = false, ParentId = 7 },
            new Permission { Id = 10, Name = "UserAccess.Roles.Edit", Title = "ویرایش دسترسی‌ها", IsMenu = false, ParentId = 7 },

            // === دسترسی ویژه ===
            new Permission { Id = 11, Name = "UserAccess.SpecialPermissions", Title = "مدیریت دسترسی‌های ویژه", IsMenu = false, ParentId = 2 },
            
            // 4. تنظیمات 
            new Permission { Id = 90, Name = "General.Settings", Title = "تنظیمات سیستم", IsMenu = true, ParentId = 100, Url = "/settings" },

            // === ماژول اطلاعات پایه (BaseInfo) ===
            new Permission { Id = 30, Name = "BaseInfo", Title = "اطلاعات پایه", IsMenu = true, ParentId = 1 },

            // واحد سنجش
            new Permission { Id = 31, Name = "BaseInfo.Units", Title = "واحد سنجش", IsMenu = true, ParentId = 30, Url = "/base-info/units" },
            new Permission { Id = 32, Name = "BaseInfo.Units.Create", Title = "تعریف واحد", IsMenu = false, ParentId = 31 },
            new Permission { Id = 33, Name = "BaseInfo.Units.Edit", Title = "ویرایش واحد", IsMenu = false, ParentId = 31 },
            new Permission { Id = 34, Name = "BaseInfo.Units.Delete", Title = "حذف واحد", IsMenu = false, ParentId = 31 },
            
            // کالاها
            new Permission { Id = 35, Name = "BaseInfo.Products", Title = "مدیریت کالاها", IsMenu = true, ParentId = 30, Url = "/base-info/products" },
            new Permission { Id = 36, Name = "BaseInfo.Products.Create", Title = "تعریف کالا", IsMenu = false, ParentId = 35 },
            new Permission { Id = 37, Name = "BaseInfo.Products.Edit", Title = "ویرایش کالا", IsMenu = false, ParentId = 35 },
            new Permission { Id = 38, Name = "BaseInfo.Products.Delete", Title = "حذف کالا", IsMenu = false, ParentId = 35 },

            // === ماژول مهندسی محصول ===
            new Permission { Id = 2000, Name = "ProductEngineering", Title = "مهندسی محصول", IsMenu = true, ParentId = 1 },
            new Permission { Id = 200, Name = "ProductEngineering.BOM", Title = "مدیریت BOM", IsMenu = true, ParentId = 2000 },
            new Permission { Id = 201, Name = "ProductEngineering.BOM.Create",  Title = "تعریف BOM", IsMenu = true, ParentId = 200 , Url = "/product-engineering/boms" },
            new Permission { Id = 202, Name = "ProductEngineering.BOM.View",  Title = "مشاهده BOM", IsMenu = false, ParentId = 200 },
            new Permission { Id = 203, Name = "ProductEngineering.BOM.Edit",  Title = "ویرایش BOM", IsMenu = false, ParentId = 200 },
            new Permission { Id = 204, Name = "ProductEngineering.BOM.Delete",  Title = "حذف BOM", IsMenu = false, ParentId = 200 },
            new Permission { Id = 205, Name = "ProductEngineering.BOM.Reports", Title = "گزارش BOM", IsMenu = true, ParentId = 200 , Url = "/product-engineering/boms" },

            // =========================================================
            // === ماژول مدیریت انبار (Inventory) - سری 3000 ===
            // =========================================================
            
            // 1. ریشه ماژول انبار
            new Permission { Id = 3000, Name = "Inventory", Title = "مدیریت انبار", IsMenu = true, ParentId = 1 },

            // --- الف) اطلاعات پایه انبار ---
            new Permission { Id = 3100, Name = "Inventory.BaseInfo", Title = "اطلاعات پایه انبار", IsMenu = true, ParentId = 3000 },
            
            // 1. مدیریت انبارها (Warehouses)
            new Permission { Id = 3101, Name = "Inventory.Warehouses", Title = "مدیریت انبارها", IsMenu = true, ParentId = 3100, Url = "/inventory/warehouses" },
            new Permission { Id = 3102, Name = "Inventory.Warehouses.View", Title = "مشاهده انبارها", IsMenu = false, ParentId = 3101 },
            new Permission { Id = 3103, Name = "Inventory.Warehouses.Create", Title = "تعریف انبار جدید", IsMenu = false, ParentId = 3101 },
            new Permission { Id = 3104, Name = "Inventory.Warehouses.Edit", Title = "ویرایش انبار", IsMenu = false, ParentId = 3101 },
            new Permission { Id = 3105, Name = "Inventory.Warehouses.Delete", Title = "حذف انبار", IsMenu = false, ParentId = 3101 },
            new Permission { Id = 3106, Name = "Inventory.Warehouses.Locations", Title = "مدیریت قفسه‌بندی (Locations)", IsMenu = false, ParentId = 3101 },
            
            // 2. مدیریت انواع سند (DocTypes)
            new Permission { Id = 3110, Name = "Inventory.DocTypes", Title = "انواع سند", IsMenu = true, ParentId = 3100, Url = "/inventory/doc-types" },
            new Permission { Id = 3111, Name = "Inventory.DocTypes.View", Title = "مشاهده انواع سند", IsMenu = false, ParentId = 3110 },
            new Permission { Id = 3112, Name = "Inventory.DocTypes.Create", Title = "تعریف نوع سند", IsMenu = false, ParentId = 3110 },
            new Permission { Id = 3113, Name = "Inventory.DocTypes.Edit", Title = "ویرایش نوع سند", IsMenu = false, ParentId = 3110 },
            new Permission { Id = 3114, Name = "Inventory.DocTypes.Delete", Title = "حذف نوع سند", IsMenu = false, ParentId = 3110 },

            // 3. تنظیمات انبار کالا (پروفایل، بچ، نقطه سفارش) - جدید
            // این بخش منو ندارد چون داخل فرم کالا است، اما پرمیشن جدا دارد
            new Permission { Id = 3120, Name = "Inventory.ProductProfiles", Title = "تنظیمات کالا و بچ", IsMenu = false, ParentId = 3100 },
            new Permission { Id = 3121, Name = "Inventory.ProductProfiles.View", Title = "مشاهده تنظیمات انبار کالا", IsMenu = false, ParentId = 3120 },
            new Permission { Id = 3122, Name = "Inventory.ProductProfiles.Edit", Title = "ویرایش تنظیمات و بچ‌ها", IsMenu = false, ParentId = 3120 },

            // --- ب) عملیات انبار (Operations) ---
            new Permission { Id = 3200, Name = "Inventory.Operations", Title = "عملیات انبار", IsMenu = true, ParentId = 3000 },
            
            // اسناد انبار
            new Permission { Id = 3201, Name = "Inventory.Docs", Title = "اسناد انبار", IsMenu = true, ParentId = 3200, Url = "/inventory/docs" },
            new Permission { Id = 3202, Name = "Inventory.Docs.Create", Title = "ثبت سند جدید", IsMenu = false, ParentId = 3201 },
            new Permission { Id = 3203, Name = "Inventory.Docs.Edit", Title = "ویرایش سند (Draft)", IsMenu = false, ParentId = 3201 },
            new Permission { Id = 3204, Name = "Inventory.Docs.Delete", Title = "حذف سند", IsMenu = false, ParentId = 3201 },
            new Permission { Id = 3205, Name = "Inventory.Docs.Approve", Title = "تایید سند (Approve)", IsMenu = false, ParentId = 3201 },
            new Permission { Id = 3206, Name = "Inventory.Docs.Revert", Title = "برگشت از تایید", IsMenu = false, ParentId = 3201 },
            new Permission { Id = 3207, Name = "Inventory.Docs.Post", Title = "قطعی سازی (Post)", IsMenu = false, ParentId = 3201 },

            // --- ج) گزارشات (Reports) ---
            new Permission { Id = 3300, Name = "Inventory.Reports", Title = "گزارشات", IsMenu = true, ParentId = 3000 },
            new Permission { Id = 3301, Name = "Inventory.Reports.CurrentStock", Title = "موجودی لحظه‌ای", IsMenu = true, ParentId = 3300, Url = "/inventory/reports/current-stock" },
            new Permission { Id = 3302, Name = "Inventory.Reports.Cardex", Title = "کاردکس کالا", IsMenu = true, ParentId = 3300, Url = "/inventory/reports/cardex" }
        );
    }
}