using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ERPDotNet.Domain.Modules.UserAccess.Entities;
using System.Reflection;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using ERPDotNet.Domain.Common; // <--- این را برای دسترسی به BaseEntity اضافه کنید
using System.Linq.Expressions;
using ERPDotNet.Application.Modules.ProductEngineering.Queries.GetWhereUsed; // <--- برای کار با Expression Tree

namespace ERPDotNet.Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext<User>, IApplicationDbContext
{
    public DbSet<AuditTrail> AuditTrails { get; set; }

    // جداول ماژول دسترسی
    public DbSet<Permission> Permissions { get; set; }
    public DbSet<RolePermission> RolePermissions { get; set; }
    public DbSet<UserPermission> UserPermissions { get; set; }
    public DbSet<Unit> Units { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<ProductUnitConversion> ProductUnitConversions { get; set; }

    // ماژول مهندسی محصول
    public DbSet<BOMHeader> BOMHeaders { get; set; }
    public DbSet<BOMDetail> BOMDetails { get; set; }
    public DbSet<BOMSubstitute> BOMSubstitutes { get; set; }
    

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // اعمال کانفیگ‌های جداگانه (مثل UnitConfiguration)
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        builder.Entity<WhereUsedRecursiveResult>(e =>
        {
            e.HasNoKey();
            // دقت 18 رقم کل، 3 رقم اعشار (برای مقدار مصرف)
            e.Property(x => x.Quantity).HasPrecision(18, 3);
        });

        // === اعمال Global Query Filter به صورت خودکار ===
        // روی تمام موجودیت‌هایی که از BaseEntity ارث برده‌اند
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                // فراخوانی متد تنظیم فیلتر برای هر موجودیت
                var method = SetGlobalQueryFilterMethod.MakeGenericMethod(entityType.ClrType);
                method.Invoke(this, new object[] { builder });
            }
        }
    }

    // این متد رفلکشن برای ساختن متد جنریک است
    static readonly MethodInfo SetGlobalQueryFilterMethod = typeof(AppDbContext)
        .GetMethods(BindingFlags.NonPublic | BindingFlags.Instance)
        .Single(t => t.IsGenericMethod && t.Name == nameof(SetGlobalQueryFilter));

    // این متد فیلتر را اعمال می‌کند
    private void SetGlobalQueryFilter<T>(ModelBuilder builder) where T : BaseEntity
    {
        builder.Entity<T>().HasQueryFilter(e => !e.IsDeleted);
    }
}