using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ERPDotNet.Domain.Modules.UserAccess.Entities;
using System.Reflection;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using ERPDotNet.Domain.Common;
using System.Linq.Expressions;
using ERPDotNet.Application.Modules.ProductEngineering.Queries.GetWhereUsed;
// فضای نام انبار را اضافه کنید:
using ERPDotNet.Domain.Modules.Inventory.Entities;

namespace ERPDotNet.Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext<User>, IApplicationDbContext
{
    public DbSet<AuditTrail> AuditTrails { get; set; }

    // جداول ماژول دسترسی
    public DbSet<Permission> Permissions { get; set; }
    public DbSet<RolePermission> RolePermissions { get; set; }
    public DbSet<UserPermission> UserPermissions { get; set; }
    
    // جداول ماژول اطلاعات پایه
    public DbSet<Unit> Units { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<ProductUnitConversion> ProductUnitConversions { get; set; }

    // ماژول مهندسی محصول
    public DbSet<BOMHeader> BOMHeaders { get; set; }
    public DbSet<BOMDetail> BOMDetails { get; set; }
    public DbSet<BOMSubstitute> BOMSubstitutes { get; set; }

    // ==========================================================
    // جداول ماژول انبار (Inventory) - این بخش باید اضافه شود
    // ==========================================================
    public DbSet<Warehouse> Warehouses { get; set; }
    public DbSet<Location> Locations { get; set; }
    
    public DbSet<InventoryItemProfile> InventoryItemProfiles { get; set; }
    public DbSet<ItemWarehouseSetting> ItemWarehouseSettings { get; set; }
    public DbSet<InventoryBatch> InventoryBatches { get; set; }
    
    public DbSet<InventoryDocType> InventoryDocTypes { get; set; }
    public DbSet<InventoryDocHeader> InventoryDocHeaders { get; set; }
    public DbSet<InventoryDocDetail> InventoryDocDetails { get; set; }
    
    public DbSet<InventoryTransaction> InventoryTransactions { get; set; }
    public DbSet<CurrentStock> CurrentStocks { get; set; }
    public DbSet<DocumentSequence> DocumentSequences { get; set; }
    // ==========================================================

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // اعمال کانفیگ‌های جداگانه (مثل UnitConfiguration و کانفیگ‌های انبار)
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        
        // کانفیگ خاص برای کوئری WhereUsed (بدون کلید)
        builder.Entity<WhereUsedRecursiveResult>(e =>
        {
            e.HasNoKey();
            e.Property(x => x.Quantity).HasPrecision(18, 3);
        });

        // === اعمال Global Query Filter به صورت خودکار ===
        // روی تمام موجودیت‌هایی که از BaseEntity ارث برده‌اند
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                var method = SetGlobalQueryFilterMethod.MakeGenericMethod(entityType.ClrType);
                method.Invoke(this, new object[] { builder });
            }
        }
    }

    static readonly MethodInfo SetGlobalQueryFilterMethod = typeof(AppDbContext)
        .GetMethods(BindingFlags.NonPublic | BindingFlags.Instance)
        .Single(t => t.IsGenericMethod && t.Name == nameof(SetGlobalQueryFilter));

    private void SetGlobalQueryFilter<T>(ModelBuilder builder) where T : BaseEntity
    {
        builder.Entity<T>().HasQueryFilter(e => !e.IsDeleted);
    }
}