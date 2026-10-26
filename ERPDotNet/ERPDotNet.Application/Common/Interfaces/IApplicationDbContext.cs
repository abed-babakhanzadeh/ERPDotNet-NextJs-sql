using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using ERPDotNet.Domain.Modules.Production.Entities;
using ERPDotNet.Domain.Modules.UserAccess.Entities;
// فضای نام انبار
using ERPDotNet.Domain.Modules.Inventory.Entities; 
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.AspNetCore.Identity;
using ERPDotNet.Domain.Modules.Workflow.Entities;

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
    DbSet<Company> Companies { get; }
    DbSet<FiscalYear> FiscalYears { get; }
    DbSet<CostCenter> CostCenters { get; }
    DbSet<ProductCategory> ProductCategories { get; }
    DbSet<ProductAttribute> ProductAttributes { get; }
    DbSet<ProductAttributeValue> ProductAttributeValues { get; }
    DbSet<ProductVariantValue> ProductVariantValues { get; }

    // === ماژول ProductEngineering ===
    DbSet<BOMHeader> BOMHeaders { get; }
    DbSet<BOMDetail> BOMDetails { get; }
    DbSet<ProductionOrder> ProductionOrders { get; }
    DbSet<ProductionOrderMaterial> ProductionOrderMaterials { get; }
    DbSet<BOMSubstitute> BOMSubstitutes { get; }
    DbSet<BOMOutput> BOMOutputs { get; }
    DbSet<BOMOperation> BOMOperations { get; }
    DbSet<WorkCenter> WorkCenters { get; }
    DbSet<ProductionOrderOperation> ProductionOrderOperations { get; }
    DbSet<ProductionOperationReport> ProductionOperationReports { get; }

    // === ماژول Inventory (جدید) ===
    DbSet<Warehouse> Warehouses { get; }
    DbSet<WarehouseUserAccess> WarehouseUserAccesses { get; }
    DbSet<Location> Locations { get; }
    
    DbSet<InventoryItemProfile> InventoryItemProfiles { get; }
    DbSet<ItemWarehouseSetting> ItemWarehouseSettings { get; }
    DbSet<InventoryBatch> InventoryBatches { get; }
    DbSet<InventorySerial> InventorySerials { get; }
    DbSet<StockCount> StockCounts { get; }
    DbSet<StockCountLine> StockCountLines { get; }
    DbSet<InventoryDocDetailSerial> InventoryDocDetailSerials { get; }
    
    // کانفیگ و اسناد
    DbSet<InventoryDocType> InventoryDocTypes { get; }
    DbSet<InventoryDocHeader> InventoryDocHeaders { get; }
    DbSet<InventoryDocDetail> InventoryDocDetails { get; }
    
    // هسته عملیاتی
    DbSet<InventoryTransaction> InventoryTransactions { get; }
    DbSet<CurrentStock> CurrentStocks { get; }
    DbSet<InventoryCostBalance> InventoryCostBalances { get; }
    DbSet<InventoryValuationSettings> InventoryValuationSettings { get; }
    // ====================================

    DbSet<TEntity> Set<TEntity>() where TEntity : class;

    DbSet<BpmsProcess> BpmsProcesses { get; }
    DbSet<BpmsProcessVersion> BpmsProcessVersions { get; }
    DbSet<BpmsState> BpmsStates { get; }
    DbSet<BpmsTransition> BpmsTransitions { get; }
    DbSet<BpmsTransitionRole> BpmsTransitionRoles { get; }
    DbSet<BpmsTransitionRule> BpmsTransitionRules { get; }
    DbSet<BpmsInstance> BpmsInstances { get; }
    DbSet<BpmsTask> BpmsTasks { get; }
    DbSet<BpmsHistory> BpmsHistories { get; }
    DbSet<BpmsDelegation> BpmsDelegations { get; }



    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
    DatabaseFacade Database { get; }
    ChangeTracker ChangeTracker { get; }
    EntityEntry<TEntity> Entry<TEntity>(TEntity entity) where TEntity : class;
}