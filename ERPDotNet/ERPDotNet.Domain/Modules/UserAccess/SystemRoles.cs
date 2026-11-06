namespace ERPDotNet.Domain.Modules.UserAccess;

/// <summary>
/// نقش‌های سیستمی: نام فنی (کلید ثابت در دیتابیس و کد، تغییر نمی‌کند) و عنوان فارسی برای نمایش.
/// هر جا به نام نقش سیستمی نیاز است از همین ثابت‌ها استفاده شود، نه رشته تکراری.
/// </summary>
public static class SystemRoles
{
    public const string Admin = "Admin";
    public const string User = "User";
    public const string Accountant = "Accountant";
    public const string WarehouseKeeper = "WarehouseKeeper";

    private static readonly IReadOnlyDictionary<string, string> Titles =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [Admin] = "مدیر سیستم",
            [User] = "کاربر عادی",
            [Accountant] = "حسابدار",
            [WarehouseKeeper] = "انباردار",
        };

    /// <summary>عنوان نمایشی نقش؛ نقش‌های تعریف‌شده توسط کاربر همان نام خودشان را دارند</summary>
    public static string TitleOf(string? name) =>
        name is not null && Titles.TryGetValue(name, out var title) ? title : name ?? string.Empty;

    /// <summary>نقش سیستمی است (عنوان فارسی دارد و نامش نباید تغییر کند)</summary>
    public static bool IsSystem(string? name) => name is not null && Titles.ContainsKey(name);

    /// <summary>نقش‌هایی که حذف‌شدنی نیستند</summary>
    public static bool IsProtected(string? name) =>
        string.Equals(name, Admin, StringComparison.OrdinalIgnoreCase)
        || string.Equals(name, User, StringComparison.OrdinalIgnoreCase);
}
