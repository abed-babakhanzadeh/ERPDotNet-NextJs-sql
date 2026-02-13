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
               .OnDelete(DeleteBehavior.Restrict); // نباید آبشاری پاک شود

        // === Seed Data (داده‌های اولیه درخت) ===
        // اینجا ساختار درختی پایه را می‌سازیم
        builder.HasData(
            // 1-ریشه اصلی
            new Permission { Id = 1, Name = "System", Title = "سیستم", IsMenu = false, ParentId = null },
            // ===  ماژول عمومی (به عنوان یک منوی اصلی) ===
            new Permission { Id = 100, Name = "General", Title = "عمومی", IsMenu = true, ParentId = 1 }, // خودش زیرمجموعه سیستم است یا نال
            
            // 2- ماژول مدیریت کاربران (منو)
            new Permission { Id = 2, Name = "UserAccess", Title = "مدیریت کاربران", IsMenu = true, ParentId = 100, Url = "/users" },
            
            // زیرمجموعه‌های مدیریت کاربران (دکمه‌ها)
            new Permission { Id = 3, Name = "UserAccess.View", Title = "مشاهده لیست", IsMenu = false, ParentId = 2 },
            new Permission { Id = 4, Name = "UserAccess.Create", Title = "افزودن کاربر", IsMenu = false, ParentId = 2 },
            new Permission { Id = 5, Name = "UserAccess.Edit", Title = "ویرایش کاربر", IsMenu = false, ParentId = 2 },
            new Permission { Id = 6, Name = "UserAccess.Delete", Title = "حذف کاربر", IsMenu = false, ParentId = 2 },

            // === 3- مدیریت نقش‌ها ===
            new Permission { Id = 7, Name = "UserAccess.Roles", Title = "مدیریت نقش‌ها", IsMenu = true, ParentId = 100, Url = "/roles" },
            new Permission { Id = 8, Name = "UserAccess.Roles.Create", Title = "تعریف نقش", IsMenu = false, ParentId = 7 },
            new Permission { Id = 9, Name = "UserAccess.Roles.Delete", Title = "حذف نقش", IsMenu = false, ParentId = 7 },
            new Permission { Id = 10, Name = "UserAccess.Roles.Edit", Title = "ویرایش دسترسی‌ها", IsMenu = false, ParentId = 7 },

            // === جدید: دسترسی ویژه ===
            new Permission { Id = 11, Name = "UserAccess.SpecialPermissions", Title = "مدیریت دسترسی‌های ویژه", IsMenu = false, ParentId = 2 },
            
            // 4. تنظیمات 
            new Permission { Id = 90, Name = "General.Settings", Title = "تنظیمات سیستم", IsMenu = true, ParentId = 100, Url = "/settings" },
            // === ماژول اطلاعات پایه (BaseInfo) ===
            new Permission { Id = 30, Name = "BaseInfo", Title = "اطلاعات پایه", IsMenu = true, ParentId = 1 },

            // زیرمجموعه واحد سنجش
            new Permission { Id = 31, Name = "BaseInfo.Units", Title = "واحد سنجش", IsMenu = true, ParentId = 30, Url = "/base-info/units" },
            new Permission { Id = 32, Name = "BaseInfo.Units.Create", Title = "تعریف واحد", IsMenu = false, ParentId = 31 },
            new Permission { Id = 33, Name = "BaseInfo.Units.Edit", Title = "ویرایش واحد", IsMenu = false, ParentId = 31 },
            new Permission { Id = 34, Name = "BaseInfo.Units.Delete", Title = "حذف واحد", IsMenu = false, ParentId = 31 },
            // 35: کالاها
            new Permission { Id = 35, Name = "BaseInfo.Products", Title = "مدیریت کالاها", IsMenu = true, ParentId = 30, Url = "/base-info/products" },
            new Permission { Id = 36, Name = "BaseInfo.Products.Create", Title = "تعریف کالا", IsMenu = false, ParentId = 35 },
            new Permission { Id = 37, Name = "BaseInfo.Products.Edit", Title = "ویرایش کالا", IsMenu = false, ParentId = 35 },
            new Permission { Id = 38, Name = "BaseInfo.Products.Delete", Title = "حذف کالا", IsMenu = false, ParentId = 35 },

            // === ماژول مهندسی محصول (ProductEngineering) ===
            new Permission { Id = 2000, Name = "ProductEngineering", Title = "مهندسی محصول", IsMenu = true, ParentId = 1 },

            // Bom
            new Permission { Id = 200, Name = "ProductEngineering.BOM", Title = "مدیریت BOM", IsMenu = true, ParentId = 2000 },
            new Permission { Id = 201, Name = "ProductEngineering.BOM.Create",  Title = "تعریف BOM", IsMenu = true, ParentId = 200 , Url = "/product-engineering/boms" },
            new Permission { Id = 202, Name = "ProductEngineering.BOM.View",  Title = "مشاهده BOM", IsMenu = false, ParentId = 200 },
            new Permission { Id = 203, Name = "ProductEngineering.BOM.Edit",  Title = "ویرایش BOM", IsMenu = false, ParentId = 200 },
            new Permission { Id = 204, Name = "ProductEngineering.BOM.Delete",  Title = "حذف BOM", IsMenu = false, ParentId = 200 },
            new Permission { Id = 205, Name = "ProductEngineering.BOM.Reports", Title = "گزارش BOM", IsMenu = true, ParentId = 200 , Url = "/product-engineering/boms" },

            // =========================================================
            // === ماژول مدیریت انبار (Inventory) - سری 3000 ===
            // =========================================================
            
            // 1. ریشه ماژول انبار (منوی اصلی در سایدبار)
            new Permission { Id = 3000, Name = "Inventory", Title = "مدیریت انبار", IsMenu = true, ParentId = 1 },

            // --- الف) اطلاعات پایه انبار (منوی گروه بندی) ---
            new Permission { Id = 3100, Name = "Inventory.BaseInfo", Title = "اطلاعات پایه", IsMenu = true, ParentId = 3000 },
            
            // مدیریت انبارها (صفحه)
            new Permission { Id = 3101, Name = "Inventory.Warehouses", Title = "تعریف انبارها", IsMenu = true, ParentId = 3100, Url = "/inventory/warehouses" },
            new Permission { Id = 3102, Name = "Inventory.Warehouses.Define", Title = "افزودن انبار", IsMenu = false, ParentId = 3101 },
            new Permission { Id = 3103, Name = "Inventory.Locations.Define", Title = "مدیریت قفسه/لوکیشن", IsMenu = false, ParentId = 3101 },
            // پرمیشن مشاهده لیست (دکمه یا اکشن) - اضافه شد
            new Permission { Id = 3104, Name = "Inventory.Warehouses.View", Title = "مشاهده لیست انبارها", IsMenu = false, ParentId = 3101 },
            new Permission { Id = 3107, Name = "Inventory.Warehouses.Edit", Title = "ویرایش لیست انبارها", IsMenu = false, ParentId = 3101 },
            new Permission { Id = 3108, Name = "Inventory.Warehouses.Delete", Title = "حذف لیست انبارها", IsMenu = false, ParentId = 3101 },
            
            // مدیریت انواع سند (صفحه)
            new Permission { Id = 3105, Name = "Inventory.DocTypes", Title = "انواع سند", IsMenu = true, ParentId = 3100, Url = "/inventory/doc-types" },
            new Permission { Id = 3106, Name = "Inventory.DocTypes.Define", Title = "تعریف نوع سند", IsMenu = false, ParentId = 3105 },

            // --- ب) عملیات انبار (Operations) ---
            new Permission { Id = 3200, Name = "Inventory.Operations", Title = "عملیات انبار", IsMenu = true, ParentId = 3000 },
            
            // اسناد انبار (صفحه اصلی)
            new Permission { Id = 3201, Name = "Inventory.Docs", Title = "اسناد انبار", IsMenu = true, ParentId = 3200, Url = "/inventory/docs" },
            
            // دسترسی‌های دکمه‌ها (IsMenu = false)
            new Permission { Id = 3202, Name = "Inventory.Docs.Create", Title = "ثبت سند جدید", IsMenu = false, ParentId = 3201 },
            new Permission { Id = 3203, Name = "Inventory.Docs.Edit", Title = "ویرایش سند (Draft)", IsMenu = false, ParentId = 3201 },
            new Permission { Id = 3204, Name = "Inventory.Docs.Delete", Title = "حذف سند", IsMenu = false, ParentId = 3201 },
            new Permission { Id = 3205, Name = "Inventory.Docs.Approve", Title = "تایید سند (Approve)", IsMenu = false, ParentId = 3201 },
            new Permission { Id = 3206, Name = "Inventory.Docs.Revert", Title = "برگشت از تایید", IsMenu = false, ParentId = 3201 },
            new Permission { Id = 3207, Name = "Inventory.Docs.Post", Title = "قطعی سازی (Post)", IsMenu = false, ParentId = 3201 },

            // --- ج) گزارشات (Reports) ---
            new Permission { Id = 3300, Name = "Inventory.Reports", Title = "گزارشات", IsMenu = true, ParentId = 3000 },
            
            // موجودی کالا
            new Permission { Id = 3301, Name = "Inventory.Reports.CurrentStock", Title = "موجودی لحظه‌ای", IsMenu = true, ParentId = 3300, Url = "/inventory/reports/current-stock" },
            
            // کاردکس کالا
            new Permission { Id = 3302, Name = "Inventory.Reports.Cardex", Title = "کاردکس کالا", IsMenu = true, ParentId = 3300, Url = "/inventory/reports/cardex" }
        );

    }
}