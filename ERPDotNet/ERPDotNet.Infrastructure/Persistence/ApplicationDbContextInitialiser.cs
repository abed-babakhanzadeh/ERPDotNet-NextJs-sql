using ERPDotNet.Domain.Modules.UserAccess.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ERPDotNet.Infrastructure.Persistence;

public class ApplicationDbContextInitialiser
{
    private readonly ILogger<ApplicationDbContextInitialiser> _logger;
    private readonly AppDbContext _context;
    private readonly UserManager<User> _userManager;

    public ApplicationDbContextInitialiser(
        ILogger<ApplicationDbContextInitialiser> logger,
        AppDbContext context,
        UserManager<User> userManager)
    {
        _logger = logger;
        _context = context;
        _userManager = userManager;
    }

    // این متد برای اعمال مایگریشن‌هاست (اگر دستی اعمال نکردید)
    public async Task InitialiseAsync()
    {
        try
        {
            if (_context.Database.IsSqlServer())
            {
                await _context.Database.MigrateAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while initializing the database.");
            throw;
        }
    }

    // این متد یوزر ادمین را می‌سازد
    public async Task SeedAsync()
    {
        try
        {
            await TrySeedAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while seeding the database.");
            throw;
        }
    }

    public async Task TrySeedAsync()
    {
        // چک می‌کنیم آیا یوزر ادمین وجود دارد؟
        var administrator = new User
        {
            UserName = "admin",
            Email = "admin@localhost",
            FirstName = "مدیر",
            LastName = "سیستم",
            PersonnelCode = "0000",
            NationalCode = "0000000000",
            IsActive = true,
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow
        };

        if (_userManager.Users.All(u => u.UserName != administrator.UserName))
        {
            // 1. ساخت یوزر با پسورد هش شده توسط Identity
            var result = await _userManager.CreateAsync(administrator, "Admin@1234");
            
            if (result.Succeeded)
            {
                // 2. دادن نقش Admin به کاربر
                // نقش "Admin" قبلاً توسط IdentityConfiguration ساخته شده است
                await _userManager.AddToRoleAsync(administrator, "Admin");
            }
        }
    }
}