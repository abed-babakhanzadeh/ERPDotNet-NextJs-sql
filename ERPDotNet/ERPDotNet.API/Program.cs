using ERPDotNet.API.ErrorHandling;
using ERPDotNet.API.Services;
using ERPDotNet.Application;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Infrastructure;
using ERPDotNet.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using Scalar.AspNetCore;
using Microsoft.Extensions.FileProviders; // اضافه شده برای اطمینان

var builder = WebApplication.CreateBuilder(args);

// Infrastructure & Application Services
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddApplicationServices();

builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IFileService, FileService>();

builder.Services.AddControllers()
    // خطای تبدیل JSON / نوع داده هم با همان قرارداد فارسی برگردد
    .ConfigureApiBehaviorOptions(o => o.InvalidModelStateResponseFactory = ModelStateProblem.Create);

// مدیریت سراسری خطا: همه خطاها به ProblemDetails فارسی با traceId تبدیل می‌شوند
builder.Services.AddProblemDetails(o => o.CustomizeProblemDetails = ApiProblem.Customize);
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddHttpContextAccessor();

builder.Services.AddOpenApi("v1", options =>
{
    options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
    options.AddSchemaTransformer<ERPDotNet.API.OpenApi.RequiredNonNullablePropertiesTransformer>();
});

// CORS اصلی برای APIها
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowPublicIP",
        b => b.WithOrigins(
                "http://94.182.39.201:3000",
                "http://localhost:3000",
                "http://192.168.0.241:3000",
                "http://192.168.0.190:3000",
                "http://192.168.1.4:3000",
                "http://192.168.1.5:3000",
                "http://10.117.115.32:3000",
                "http://10.22.159.64:3000"
             )
              .AllowAnyMethod()
              .AllowAnyHeader()
              .WithExposedHeaders("X-Trace-Id")
              .AllowCredentials());
});

var app = builder.Build();

// هنگام تولید سند OpenAPI در زمان build (ابزار GetDocument.Insider) دیتابیس در دسترس نیست
var isGeneratingOpenApiDocument = System.Reflection.Assembly.GetEntryAssembly()?.GetName().Name == "GetDocument.Insider";

if (!isGeneratingOpenApiDocument)
{
    // Database Migration
    await MigrateDatabaseAsync(app);

    // Seed Database
    using var scope = app.Services.CreateScope();
    var initialiser = scope.ServiceProvider.GetRequiredService<ApplicationDbContextInitialiser>();
    await initialiser.InitialiseAsync();
    await initialiser.SeedAsync();
}

if (app.Environment.IsDevelopment() || isGeneratingOpenApiDocument)
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

// باید اولین middleware باشد تا خطای همه مراحل بعدی را بگیرد؛
// پاسخ‌های خالی 401/403/404 هم با StatusCodePages به ProblemDetails فارسی تبدیل می‌شوند
app.UseExceptionHandler();
app.UseStatusCodePages();

app.UseCors("AllowPublicIP");
app.UseAuthentication();

// -------------------------------------------------------------------------
// تنظیمات حیاتی برای دانلود تصاویر (رفع مشکل CORS)
// -------------------------------------------------------------------------
var staticFileOptions = new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        // این کد باعث می‌شود مرورگر اجازه دانلود فایل را از هر دامنه‌ای بدهد
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Headers", "*");
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Methods", "GET, OPTIONS");
    }
};

app.UseStaticFiles(staticFileOptions);
// -------------------------------------------------------------------------

app.UseAuthorization();
app.MapControllers();

app.Run();

// ... (Helper Methods and Classes remain the same) ...
// متدهای کمکی پایین فایل (MigrateDatabaseAsync و BearerSecuritySchemeTransformer) را مانند قبل نگه دارید.
static async Task MigrateDatabaseAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;
    
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        if (context.Database.IsRelational())
        {
            await context.Database.MigrateAsync();
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating the database.");
    }
}

internal sealed class BearerSecuritySchemeTransformer : IOpenApiDocumentTransformer
{
    private readonly IAuthenticationSchemeProvider _authenticationSchemeProvider;

    public BearerSecuritySchemeTransformer(IAuthenticationSchemeProvider authenticationSchemeProvider)
    {
        _authenticationSchemeProvider = authenticationSchemeProvider;
    }

    public async Task TransformAsync(
        OpenApiDocument document, 
        OpenApiDocumentTransformerContext context, 
        CancellationToken cancellationToken)
    {
        var authenticationSchemes = await _authenticationSchemeProvider.GetAllSchemesAsync();

        if (authenticationSchemes.Any(authScheme => authScheme.Name == "Bearer"))
        {
            var requirements = new Dictionary<string, IOpenApiSecurityScheme>
            {
                ["Bearer"] = new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    In = ParameterLocation.Header,
                    BearerFormat = "JWT"
                }
            };

            document.Components ??= new OpenApiComponents();
            document.Components.SecuritySchemes = requirements;
        }
    }
}