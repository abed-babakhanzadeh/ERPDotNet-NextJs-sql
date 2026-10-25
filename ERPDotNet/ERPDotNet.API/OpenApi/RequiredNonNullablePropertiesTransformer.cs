using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace ERPDotNet.API.OpenApi;

// در قرارداد OpenAPI هر پراپرتی non-nullable را الزامی اعلام می‌کند.
// بدون این، تایپ‌های تولیدشده فرانت همه فیلدها را اختیاری (?) می‌بینند، در حالی که سرور همیشه آن‌ها را پر می‌کند.
internal sealed class RequiredNonNullablePropertiesTransformer : IOpenApiSchemaTransformer
{
    public Task TransformAsync(OpenApiSchema schema, OpenApiSchemaTransformerContext context, CancellationToken cancellationToken)
    {
        if (schema.Properties is not { Count: > 0 }) return Task.CompletedTask;

        foreach (var (name, property) in schema.Properties)
        {
            var type = property.Type ?? 0;
            // فیلد nullable یا ارجاع به schema دیگر (که nullable بودنش معلوم نیست) الزامی نمی‌شود
            if ((type & JsonSchemaType.Null) != 0 || property is OpenApiSchemaReference) continue;
            if (property.OneOf is { Count: > 0 } || property.AnyOf is { Count: > 0 }) continue;

            schema.Required ??= new HashSet<string>();
            schema.Required.Add(name);
        }

        return Task.CompletedTask;
    }
}
