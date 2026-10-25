using System.Globalization;
using FluentValidation;

namespace ERPDotNet.Application.Common.Validation;

// پیام‌های پیش‌فرض FluentValidation (مثل NotEmpty و GreaterThan) فارسی می‌شوند و
// نام فیلدها در پیام به‌جای نام انگلیسی پراپرتی، عنوان فارسی آن است.
// ولیدیتوری که WithName یا WithMessage فارسی دارد، همان را نشان می‌دهد.
public static class PersianValidation
{
    private static readonly Dictionary<string, string> FieldNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Id"] = "شناسه",
        ["Title"] = "عنوان",
        ["Name"] = "نام",
        ["Code"] = "کد",
        ["Description"] = "توضیحات",
        ["Symbol"] = "نماد",
        ["Precision"] = "دقت اعشار",
        ["Version"] = "نسخه",
        ["RowVersion"] = "نسخه رکورد",
        ["FromDate"] = "تاریخ شروع",
        ["ToDate"] = "تاریخ پایان",
        ["DocDate"] = "تاریخ سند",
        ["DocTypeId"] = "نوع سند",
        ["WarehouseId"] = "انبار",
        ["DestinationWarehouseId"] = "انبار مقصد",
        ["LocationId"] = "قفسه",
        ["DestinationLocationId"] = "قفسه مقصد",
        ["ProductId"] = "کالا",
        ["ChildProductId"] = "ماده اولیه",
        ["SubstituteProductId"] = "کالای جایگزین",
        ["UnitId"] = "واحد",
        ["InputUnitId"] = "واحد ورودی",
        ["BatchId"] = "بچ",
        ["BatchNumber"] = "شماره بچ",
        ["Quantity"] = "مقدار",
        ["MainUnitQuantity"] = "تعداد",
        ["InputQuantity"] = "مقدار ورودی",
        ["WastePercentage"] = "درصد ضایعات",
        ["Factor"] = "ضریب",
        ["Priority"] = "اولویت",
        ["MaxMixPercentage"] = "درصد مجاز میکس",
        ["ConversionFactor"] = "ضریب تبدیل",
        ["Username"] = "نام کاربری",
        ["Password"] = "رمز عبور",
        ["NewPassword"] = "رمز عبور جدید",
        ["CurrentPassword"] = "رمز عبور فعلی",
        ["Email"] = "ایمیل",
        ["FirstName"] = "نام",
        ["LastName"] = "نام خانوادگی",
        ["ProcessVersionId"] = "نسخه فرآیند",
        ["FromStateId"] = "مرحله مبدأ",
        ["ToStateId"] = "مرحله مقصد",
        ["ActionTitle"] = "متن دکمه",
        ["ButtonVariant"] = "نوع دکمه",
        ["StateCode"] = "کد مرحله",
        ["ProcessCode"] = "کد فرآیند",
        ["TransitionId"] = "دکمه",
        ["RoleIds"] = "نقش‌ها",
        ["Details"] = "اقلام",
    };

    public static void Configure()
    {
        ValidatorOptions.Global.LanguageManager.Culture = new CultureInfo("fa");
        ValidatorOptions.Global.DisplayNameResolver = (_, member, _) =>
            member != null && FieldNames.TryGetValue(member.Name, out var persian) ? persian : member?.Name;
    }

    // برای تست و ابزارها: عنوان فارسی یک فیلد (یا خود نام در صورت نبود)
    public static string FieldName(string propertyName) =>
        FieldNames.TryGetValue(propertyName, out var persian) ? persian : propertyName;
}
