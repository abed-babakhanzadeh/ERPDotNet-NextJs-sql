using System.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.ErrorHandling;

// قرارداد یکسان خطای API (RFC 7807 ProblemDetails) با متن فارسی.
// فیلدهای اضافه:
//   code      کد ماشینی ثابت برای فرانت (validation, business_rule, not_found, conflict, ...)
//   message   همان detail (سازگاری با کد فعلی فرانت)
//   messages  فهرست کامل پیام‌ها برای نمایش
//   errors    خطاهای هر فیلد { "details[0].mainUnitQuantity": ["..."] }
//   traceId   شناسه پیگیری؛ کاربر به پشتیبانی می‌دهد و همان رکورد در لاگ سرور پیدا می‌شود
public static class ApiProblem
{
    public static class Codes
    {
        public const string Validation = "validation";
        public const string BusinessRule = "business_rule";
        public const string NotFound = "not_found";
        public const string Conflict = "conflict";
        public const string Unauthorized = "unauthorized";
        public const string Forbidden = "forbidden";
        public const string BadRequest = "bad_request";
        public const string ServerError = "server_error";
    }

    private static readonly Dictionary<int, (string Code, string Title, string Detail)> Defaults = new()
    {
        [StatusCodes.Status400BadRequest] = (Codes.BadRequest, "درخواست نامعتبر", "درخواست ارسالی معتبر نیست."),
        [StatusCodes.Status401Unauthorized] = (Codes.Unauthorized, "نیاز به ورود", "نشست شما به پایان رسیده است. لطفاً دوباره وارد شوید."),
        [StatusCodes.Status403Forbidden] = (Codes.Forbidden, "عدم دسترسی", "شما دسترسی لازم برای این عملیات را ندارید."),
        [StatusCodes.Status404NotFound] = (Codes.NotFound, "یافت نشد", "اطلاعات مورد نظر یافت نشد."),
        [StatusCodes.Status405MethodNotAllowed] = (Codes.BadRequest, "درخواست نامعتبر", "این نوع درخواست پشتیبانی نمی‌شود."),
        [StatusCodes.Status409Conflict] = (Codes.Conflict, "تعارض اطلاعات", "این اطلاعات همزمان تغییر کرده است. صفحه را تازه کنید."),
        [StatusCodes.Status415UnsupportedMediaType] = (Codes.BadRequest, "درخواست نامعتبر", "فرمت داده ارسالی پشتیبانی نمی‌شود."),
        [StatusCodes.Status422UnprocessableEntity] = (Codes.BusinessRule, "عملیات مجاز نیست", "این عملیات با قوانین سیستم مغایرت دارد."),
        [StatusCodes.Status500InternalServerError] = (Codes.ServerError, "خطای سرور", "خطای غیرمنتظره‌ای رخ داد. اگر تکرار شد، کد پیگیری را به پشتیبانی اعلام کنید."),
    };

    // روی همه ProblemDetailsهای تولیدشده (از استثناها، StatusCodePages و ModelState) اعمال می‌شود
    public static void Customize(ProblemDetailsContext context) => Enrich(context.HttpContext, context.ProblemDetails);

    public static void Enrich(HttpContext httpContext, ProblemDetails problem)
    {
        var status = problem.Status ?? httpContext.Response.StatusCode;
        problem.Status = status;

        var defaults = Defaults.TryGetValue(status, out var d)
            ? d
            : (status >= 500 ? Defaults[StatusCodes.Status500InternalServerError] : Defaults[StatusCodes.Status400BadRequest]);

        // عنوان‌های پیش‌فرض انگلیسی ASP.NET را با فارسی جایگزین می‌کنیم
        if (string.IsNullOrWhiteSpace(problem.Title) || IsFrameworkTitle(problem.Title))
            problem.Title = defaults.Title;
        if (string.IsNullOrWhiteSpace(problem.Detail))
            problem.Detail = defaults.Detail;

        problem.Type = null;
        problem.Instance = null;

        problem.Extensions.TryAdd("code", defaults.Code);
        problem.Extensions["message"] = problem.Detail;
        problem.Extensions.TryAdd("messages", new[] { problem.Detail });

        var traceId = Activity.Current?.Id ?? httpContext.TraceIdentifier;
        problem.Extensions["traceId"] = traceId;
        httpContext.Response.Headers["X-Trace-Id"] = traceId;
    }

    // ASP.NET برای خطاهای عمومی عنوان انگلیسی می‌گذارد (مثلاً "Not Found" یا "One or more validation errors occurred.")
    private static bool IsFrameworkTitle(string title) =>
        title.Length > 0 && title[0] < 128;

    // کلید فیلدها را هم‌شکل نام فیلدهای JSON فرانت (camelCase) می‌کند: Details[0].MainUnitQuantity -> details[0].mainUnitQuantity
    public static string ToFieldKey(string propertyName) =>
        string.Join('.', propertyName.Split('.').Select(part =>
            part.Length == 0 ? part : char.ToLowerInvariant(part[0]) + part[1..]));
}
