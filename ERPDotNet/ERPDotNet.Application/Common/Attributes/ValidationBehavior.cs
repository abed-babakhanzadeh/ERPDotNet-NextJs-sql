using FluentValidation;
using MediatR;

namespace ERPDotNet.Application.Common.Behaviors;

public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
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

        // اجرای تمام ولیدیتورهای مرتبط با این درخواست به صورت همزمان
        var validationResults = await Task.WhenAll(
            _validators.Select(v => v.ValidateAsync(context, cancellationToken)));

        // جمع‌آوری خطاها
        var failures = validationResults
            .Where(r => r.Errors.Any())
            .SelectMany(r => r.Errors)
            .ToList();

        // اگر خطایی بود، پرتاب کن (که بعداً توسط GlobalExceptionHandler گرفته می‌شود)
        if (failures.Any())
            throw new ValidationException(failures);

        return await next();
    }
}