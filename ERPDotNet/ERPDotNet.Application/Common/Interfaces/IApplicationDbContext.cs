using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities; // <--- این را اضافه کنید
using ERPDotNet.Domain.Modules.UserAccess.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Infrastructure; // برای DatabaseFacade
using Microsoft.AspNetCore.Identity;

namespace ERPDotNet.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    // جداول UserAccess
    DbSet<User> Users { get; }
    DbSet<IdentityRole> Roles { get; }
    DbSet<IdentityUserRole<string>> UserRoles { get; }
    DbSet<Permission> Permissions { get; }
    DbSet<RolePermission> RolePermissions { get; }
    DbSet<UserPermission> UserPermissions { get; }

    // جداول BaseInfo
    DbSet<Unit> Units { get; }
    DbSet<Product> Products { get; }
    DbSet<ProductUnitConversion> ProductUnitConversions { get; }

    // جداول ProductEngineering (BOM) ---> این‌ها را اضافه کنید
    DbSet<BOMHeader> BOMHeaders { get; }
    DbSet<BOMDetail> BOMDetails { get; }
    DbSet<BOMSubstitute> BOMSubstitutes { get; }
    DbSet<TEntity> Set<TEntity>() where TEntity : class;

    // متدهای پایه
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
    // object Set<T>();

    DatabaseFacade Database { get; }
    
    // === متد جدید و حیاتی برای همروندی ===
    EntityEntry<TEntity> Entry<TEntity>(TEntity entity) where TEntity : class;
}