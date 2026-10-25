using ERPDotNet.Application.Common.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.API.ErrorHandling;

// تبدیل همه استثناها به پاسخ ProblemDetails فارسی و یکسان.
// استثناهای شناخته‌شده (قانون کسب‌وکار، اعتبارسنجی، ...) پیام خودشان را نشان می‌دهند؛
// استثنای ناشناخته جزئیات داخلی را لو نمی‌دهد و فقط با traceId در لاگ قابل ردیابی است.
public sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly IProblemDetailsService _problemDetailsService;
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(IProblemDetailsService problemDetailsService, ILogger<GlobalExceptionHandler> logger)
    {
        _problemDetailsService = problemDetailsService;
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var problem = Map(exception);

        if (problem.Status >= StatusCodes.Status500InternalServerError)
            _logger.LogError(exception, "Unhandled exception on {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);
        else
            _logger.LogWarning("{ExceptionType} on {Method} {Path}: {Message}",
                exception.GetType().Name, httpContext.Request.Method, httpContext.Request.Path, exception.Message);

        httpContext.Response.StatusCode = problem.Status!.Value;
        return await _problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problem,
            Exception = exception
        });
    }

    public static ProblemDetails Map(Exception exception) => exception switch
    {
        FluentValidation.ValidationException ex => Validation(ex),
        System.ComponentModel.DataAnnotations.ValidationException ex =>
            Problem(StatusCodes.Status400BadRequest, ApiProblem.Codes.Validation, "اطلاعات نامعتبر", ex.Message),
        BusinessRuleException ex => BusinessRule(ex),
        KeyNotFoundException ex => Problem(StatusCodes.Status404NotFound, ApiProblem.Codes.NotFound, "یافت نشد", PersianOr(ex.Message, "اطلاعات مورد نظر یافت نشد.")),
        ConflictException ex => Problem(StatusCodes.Status409Conflict, ApiProblem.Codes.Conflict, "تعارض اطلاعات", ex.Message),
        DbUpdateConcurrencyException => Problem(StatusCodes.Status409Conflict, ApiProblem.Codes.Conflict, "تعارض اطلاعات", ConflictException.ConcurrencyMessage),
        DbUpdateException ex when SqlErrorNumber(ex) is 2601 or 2627 =>
            Problem(StatusCodes.Status409Conflict, ApiProblem.Codes.Conflict, "اطلاعات تکراری", "رکوردی با همین مشخصات قبلاً ثبت شده است."),
        DbUpdateException ex when SqlErrorNumber(ex) is 547 =>
            Problem(StatusCodes.Status409Conflict, ApiProblem.Codes.Conflict, "وابستگی اطلاعات", "این اطلاعات در بخش‌های دیگر سیستم استفاده شده و قابل حذف یا تغییر نیست."),
        ForbiddenAccessException ex => Problem(StatusCodes.Status403Forbidden, ApiProblem.Codes.Forbidden, "عدم دسترسی", ex.Message),
        UnauthorizedAccessException ex => Problem(StatusCodes.Status403Forbidden, ApiProblem.Codes.Forbidden, "عدم دسترسی", PersianOr(ex.Message, "شما دسترسی لازم برای این عملیات را ندارید.")),
        OperationCanceledException => Problem(499, ApiProblem.Codes.BadRequest, "لغو درخواست", "درخواست لغو شد."),
        _ => new ProblemDetails { Status = StatusCodes.Status500InternalServerError }
    };

    private static ProblemDetails Validation(FluentValidation.ValidationException ex)
    {
        var failures = ex.Errors.ToList();
        if (failures.Count == 0)
            return Problem(StatusCodes.Status400BadRequest, ApiProblem.Codes.Validation, "اطلاعات نامعتبر", ex.Message);

        var messages = failures.Select(f => f.ErrorMessage).Distinct().ToArray();
        var problem = Problem(StatusCodes.Status400BadRequest, ApiProblem.Codes.Validation, "اطلاعات نامعتبر",
            messages.Length == 1 ? messages[0] : "لطفاً موارد مشخص‌شده را اصلاح کنید.");

        problem.Extensions["messages"] = messages;
        problem.Extensions["errors"] = failures
            .GroupBy(f => string.IsNullOrEmpty(f.PropertyName) ? "" : ApiProblem.ToFieldKey(f.PropertyName))
            .ToDictionary(g => g.Key, g => g.Select(f => f.ErrorMessage).Distinct().ToArray());
        return problem;
    }

    private static ProblemDetails BusinessRule(BusinessRuleException ex)
    {
        // پیام‌های چندخطی (مثلاً چند خطای موجودی) به صورت فهرست هم ارسال می‌شوند
        var messages = ex.Errors
            .SelectMany(e => e.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .ToArray();
        var problem = Problem(StatusCodes.Status422UnprocessableEntity, ApiProblem.Codes.BusinessRule, "عملیات مجاز نیست",
            messages.Length == 1 ? messages[0] : string.Join("\n", messages));
        problem.Extensions["messages"] = messages;
        return problem;
    }

    private static ProblemDetails Problem(int status, string code, string title, string detail)
    {
        var problem = new ProblemDetails { Status = status, Title = title, Detail = detail };
        problem.Extensions["code"] = code;
        return problem;
    }

    // پیام‌های انگلیسی پیش‌فرض دات‌نت (مثل "Attempted to perform an unauthorized operation.") به کاربر نمایش داده نمی‌شوند
    private static string PersianOr(string message, string fallback) =>
        message.Any(c => c is >= '؀' and <= 'ۿ') ? message : fallback;

    private static int? SqlErrorNumber(DbUpdateException ex) =>
        (ex.InnerException as SqlException)?.Number;
}
