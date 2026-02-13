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

    // جداول ماژول انبار (Inventory)
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

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        // 1. ابتدا تنظیمات Identity
        base.OnModelCreating(builder);

        // 2. اعمال تمام کانفیگ‌های موجود در اسمبلی (Configurations)
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        
        // 3. کانفیگ خاص برای کوئری WhereUsed (بدون کلید)
        builder.Entity<WhereUsedRecursiveResult>(e =>
        {
            e.HasNoKey();
            e.Property(x => x.Quantity).HasPrecision(18, 3);
        });

        // 4. === اصلاحیه اصلی: اعمال Global Query Filter به صورت قطعی ===
        // این بخش باید بعد از تمام کانفیگ‌ها باشد تا اورراید نشود
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            // بررسی ارث‌بری از BaseEntity
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                // ساخت عبارت e => !e.IsDeleted به صورت داینامیک
                var parameter = Expression.Parameter(entityType.ClrType, "e");
                
                // دسترسی به پروپرتی IsDeleted
                var propertyAccess = Expression.Property(parameter, nameof(BaseEntity.IsDeleted));
                
                // ساخت شرط e.IsDeleted == false
                var equalExpression = Expression.Equal(propertyAccess, Expression.Constant(false));
                
                // تبدیل به Lambda
                var lambda = Expression.Lambda(equalExpression, parameter);

                // اعمال فیلتر روی مدل
                builder.Entity(entityType.ClrType).HasQueryFilter(lambda);
            }
        }
    }

    // متد ذخیره تغییرات (پیش‌فرض IApplicationDbContext)
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await base.SaveChangesAsync(cancellationToken);
    }
}