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

var builder = WebApplication.CreateBuilder(args);

// Infrastructure Layer (Database, Identity, Redis, Authentication)
builder.Services.AddInfrastructureServices(builder.Configuration);

// Application Layer (CQRS, MediatR, etc.)
builder.Services.AddApplicationServices();

// API Layer Services (این سرویس‌ها در لایه API هستند)
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IFileService, FileService>();

// Presentation Layer (Controllers, OpenAPI, CORS)
builder.Services.AddControllers();
builder.Services.AddHttpContextAccessor();

builder.Services.AddOpenApi("v1", options =>
{
    options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
});

builder.Services.AddCors(options =>
{
    // نکته مهم برای موبایل:
    // در حالت توسعه، بهتر است اجازه دسترسی از همه جا را بدهیم تا
    // موبایل با IPهای مختلف بتواند متصل شود.
    // در پروداکشن می‌توانید این را محدود کنید.
    options.AddPolicy("AllowAll",
        b => b.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader());
});

var app = builder.Build();

// Automatic Database Migration
await MigrateDatabaseAsync(app);



// =========================================================
// SEED DATABASE: ساخت یوزر ادمین در لحظه اجرای برنامه
// =========================================================
using (var scope = app.Services.CreateScope())
{
    var initialiser = scope.ServiceProvider.GetRequiredService<ApplicationDbContextInitialiser>();
    
    // اول دیتابیس را (اگر ساخته نشده) می‌سازد و مایگریشن‌ها (نقش‌ها) را اعمال می‌کند
    await initialiser.InitialiseAsync(); 
    
    // سپس یوزر ادمین را می‌سازد
    await initialiser.SeedAsync();       
}
// =========================================================

// Middleware Pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

// برای موبایل از پالیسی آزادتر استفاده می‌کنیم تا خطای Network Error نگیریم
app.UseCors("AllowAll");

app.UseAuthentication();
app.UseStaticFiles();
app.UseAuthorization();
app.MapControllers();

app.Run();

// Helper Methods
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

// OpenAPI Bearer Security Scheme
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