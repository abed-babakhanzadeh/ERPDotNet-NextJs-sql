using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.ErrorHandling;

// خطای Model Binding (مثلاً ارسال متن به‌جای عدد) پیام انگلیسی و فنی دارد؛
// به پیام فارسی برای هر فیلد تبدیل می‌شود و جزئیات فنی فقط در لاگ می‌ماند
public static class ModelStateProblem
{
    public const string FieldMessage = "مقدار وارد شده برای این فیلد معتبر نیست.";

    public static IActionResult Create(ActionContext context)
    {
        var errors = context.ModelState
            .Where(e => e.Value?.Errors.Count > 0)
            .ToDictionary(
                e => ApiProblem.ToFieldKey(e.Key.TrimStart('$', '.')),
                _ => new[] { FieldMessage });

        var logger = context.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(ModelStateProblem));
        logger.LogWarning("Model binding failed on {Path}: {Errors}", context.HttpContext.Request.Path,
            string.Join("; ", context.ModelState.SelectMany(e => e.Value!.Errors.Select(x => $"{e.Key}: {x.ErrorMessage}"))));

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "اطلاعات نامعتبر",
            Detail = "فرمت اطلاعات ارسالی معتبر نیست. لطفاً موارد مشخص‌شده را اصلاح کنید."
        };
        problem.Extensions["code"] = ApiProblem.Codes.Validation;
        problem.Extensions["errors"] = errors;
        ApiProblem.Enrich(context.HttpContext, problem);

        return new ObjectResult(problem) { StatusCode = StatusCodes.Status400BadRequest, ContentTypes = { "application/problem+json" } };
    }
}
