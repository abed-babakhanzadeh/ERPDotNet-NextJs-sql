using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERPDotNet.Infrastructure.Modules.UserAccess.Persistence.Configurations;

public class IdentityConfiguration : 
    IEntityTypeConfiguration<IdentityRole>,
    IEntityTypeConfiguration<IdentityUserRole<string>>,
    IEntityTypeConfiguration<IdentityUserClaim<string>>,
    IEntityTypeConfiguration<IdentityUserLogin<string>>,
    IEntityTypeConfiguration<IdentityRoleClaim<string>>,
    IEntityTypeConfiguration<IdentityUserToken<string>>
{
    public void Configure(EntityTypeBuilder<IdentityRole> builder)
    {
        builder.ToTable("roles", "security");

        // === انتقال Seed Data به اینجا ===
        builder.HasData(
            new IdentityRole { Id = "1", Name = "Admin", NormalizedName = "ADMIN", ConcurrencyStamp = "1" },
            new IdentityRole { Id = "2", Name = "User", NormalizedName = "USER", ConcurrencyStamp = "2" },
            new IdentityRole { Id = "3", Name = "Accountant", NormalizedName = "ACCOUNTANT", ConcurrencyStamp = "3" },
            new IdentityRole { Id = "4", Name = "WarehouseKeeper", NormalizedName = "WAREHOUSEKEEPER", ConcurrencyStamp = "4" }
        );
    }

    public void Configure(EntityTypeBuilder<IdentityUserRole<string>> builder) => builder.ToTable("user_roles", "security");
    public void Configure(EntityTypeBuilder<IdentityUserClaim<string>> builder) => builder.ToTable("user_claims", "security");
    public void Configure(EntityTypeBuilder<IdentityUserLogin<string>> builder) => builder.ToTable("user_logins", "security");
    public void Configure(EntityTypeBuilder<IdentityRoleClaim<string>> builder) => builder.ToTable("role_claims", "security");
    public void Configure(EntityTypeBuilder<IdentityUserToken<string>> builder) => builder.ToTable("user_tokens", "security");
}