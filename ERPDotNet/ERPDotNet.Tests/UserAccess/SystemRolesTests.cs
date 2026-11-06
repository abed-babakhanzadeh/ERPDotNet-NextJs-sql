using ERPDotNet.Domain.Modules.UserAccess;
using Xunit;

namespace ERPDotNet.Tests.UserAccess;

public class SystemRolesTests
{
    [Theory]
    [InlineData("Admin", "مدیر سیستم")]
    [InlineData("User", "کاربر عادی")]
    [InlineData("Accountant", "حسابدار")]
    [InlineData("WarehouseKeeper", "انباردار")]
    [InlineData("admin", "مدیر سیستم")]
    public void System_roles_have_persian_titles(string name, string title)
    {
        Assert.Equal(title, SystemRoles.TitleOf(name));
        Assert.True(SystemRoles.IsSystem(name));
    }

    [Fact]
    public void Custom_roles_keep_their_own_name()
    {
        // نقش تعریف‌شده توسط کاربر ترجمه ندارد و همان نامش نمایش داده می‌شود
        Assert.Equal("کارشناس فروش", SystemRoles.TitleOf("کارشناس فروش"));
        Assert.False(SystemRoles.IsSystem("کارشناس فروش"));
        Assert.Equal(string.Empty, SystemRoles.TitleOf(null));
    }

    [Theory]
    [InlineData("Admin", true)]
    [InlineData("USER", true)]
    [InlineData("Accountant", false)]
    [InlineData("WarehouseKeeper", false)]
    [InlineData("کارشناس فروش", false)]
    [InlineData(null, false)]
    public void Only_admin_and_user_are_protected_from_delete(string? name, bool expected)
    {
        Assert.Equal(expected, SystemRoles.IsProtected(name));
    }
}
