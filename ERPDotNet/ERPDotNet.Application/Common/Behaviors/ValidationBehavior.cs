using FluentValidation;
using MediatR;

namespace ERPDotNet.Application.Common.Behaviors;

// قید notnull (نه IRequest<TResponse>) تا دستورهای بدون خروجی (IRequest) هم اعتبارسنجی شوند
public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        // اگر هیچ قانونی برای این درخواست تعریف نشده، رد شو
        if (!_validators.Any())
        {
            return await next();
        }

        var context = new ValidationContext<TRequest>(request);

        // اجرای ترتیبی: ولیدیتورها DbContext مشترک دارند و EF اجرای همزمان دو کوئری روی یک Context را نمی‌پذیرد
        var failures = new List<FluentValidation.Results.ValidationFailure>();
        foreach (var validator in _validators)
        {
            var result = await validator.ValidateAsync(context, cancellationToken);
            failures.AddRange(result.Errors);
        }

        // اگر خطایی بود، پرتاب کن (که بعداً توسط GlobalExceptionHandler گرفته می‌شود)
        if (failures.Any())
            throw new ValidationException(failures);

        return await next();
    }
}