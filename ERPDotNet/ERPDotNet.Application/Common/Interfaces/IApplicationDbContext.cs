using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using ERPDotNet.Domain.Modules.UserAccess.Entities;
// فضای نام انبار
using ERPDotNet.Domain.Modules.Inventory.Entities; 
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.AspNetCore.Identity;

namespace ERPDotNet.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    // === ماژول UserAccess ===
    DbSet<User> Users { get; }
    DbSet<IdentityRole> Roles { get; }
    DbSet<IdentityUserRole<string>> UserRoles { get; }
    DbSet<Permission> Permissions { get; }
    DbSet<RolePermission> RolePermissions { get; }
    DbSet<UserPermission> UserPermissions { get; }

    // === ماژول BaseInfo ===
    DbSet<Unit> Units { get; }
    DbSet<Product> Products { get; }
    DbSet<ProductUnitConversion> ProductUnitConversions { get; }

    // === ماژول ProductEngineering ===
    DbSet<BOMHeader> BOMHeaders { get; }
    DbSet<BOMDetail> BOMDetails { get; }
    DbSet<BOMSubstitute> BOMSubstitutes { get; }

    // === ماژول Inventory (جدید) ===
    DbSet<Warehouse> Warehouses { get; }
    DbSet<Location> Locations { get; }
    
    DbSet<InventoryItemProfile> InventoryItemProfiles { get; }
    DbSet<ItemWarehouseSetting> ItemWarehouseSettings { get; }
    DbSet<InventoryBatch> InventoryBatches { get; }
    
    // کانفیگ و اسناد
    DbSet<InventoryDocType> InventoryDocTypes { get; }
    DbSet<InventoryDocHeader> InventoryDocHeaders { get; }
    DbSet<InventoryDocDetail> InventoryDocDetails { get; }
    
    // هسته عملیاتی
    DbSet<InventoryTransaction> InventoryTransactions { get; }
    DbSet<CurrentStock> CurrentStocks { get; }
    // ====================================

    DbSet<TEntity> Set<TEntity>() where TEntity : class;
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
    DatabaseFacade Database { get; }
    ChangeTracker ChangeTracker { get; }
    EntityEntry<TEntity> Entry<TEntity>(TEntity entity) where TEntity : class;
}