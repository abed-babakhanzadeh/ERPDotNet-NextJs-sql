using System.Text.Json;
using ERPDotNet.API.ErrorHandling;
using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Validation;
using ERPDotNet.Application.Modules.Inventory.Commands.PostInventoryDoc;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace ERPDotNet.Tests.Api;

public class ErrorContractTests
{
    [Fact]
    public async Task Business_rule_returns_422_with_each_message_listed()
    {
        var body = await Handle(new BusinessRuleException("موجودی ناکافی: کالای 1\nموجودی ناکافی: کالای 2"));

        Assert.Equal(422, body.Status);
        Assert.Equal("business_rule", body.Code);
        Assert.Equal(["موجودی ناکافی: کالای 1", "موجودی ناکافی: کالای 2"], body.Messages);
        Assert.Equal(body.Detail, body.Message);
    }

    [Fact]
    public async Task Validation_returns_400_with_camel_case_field_errors()
    {
        var exception = new ValidationException([
            new ValidationFailure("Details[0].MainUnitQuantity", "تعداد باید بزرگتر از صفر باشد."),
            new ValidationFailure("WarehouseId", "انبار الزامی است.")
        ]);

        var body = await Handle(exception);

        Assert.Equal(400, body.Status);
        Assert.Equal("validation", body.Code);
        Assert.Equal(["تعداد باید بزرگتر از صفر باشد."], body.Errors!["details[0].mainUnitQuantity"]);
        Assert.Equal(["انبار الزامی است."], body.Errors["warehouseId"]);
        Assert.Equal(2, body.Messages.Length);
    }

    [Fact]
    public async Task Not_found_with_english_message_is_shown_in_persian()
    {
        var body = await Handle(new KeyNotFoundException("Entity 5 not found."));

        Assert.Equal(404, body.Status);
        Assert.Equal("اطلاعات مورد نظر یافت نشد.", body.Detail);
    }

    [Fact]
    public async Task Concurrency_conflict_returns_409()
    {
        var body = await Handle(new DbUpdateConcurrencyException("stale"));

        Assert.Equal(409, body.Status);
        Assert.Equal("conflict", body.Code);
        Assert.Equal(ConflictException.ConcurrencyMessage, body.Detail);
    }

    [Fact]
    public async Task Forbidden_returns_403()
    {
        var body = await Handle(new ForbiddenAccessException());

        Assert.Equal(403, body.Status);
        Assert.Equal("forbidden", body.Code);
    }

    [Fact]
    public async Task Unexpected_error_hides_internals_and_returns_trace_id()
    {
        var (body, response) = await HandleWithResponse(new InvalidOperationException("SQL timeout on server db01"));

        Assert.Equal(500, body.Status);
        Assert.Equal("server_error", body.Code);
        Assert.DoesNotContain("db01", body.Detail);
        Assert.False(string.IsNullOrEmpty(body.TraceId));
        Assert.Equal(body.TraceId, response.Headers["X-Trace-Id"].ToString());
    }

    [Fact]
    public async Task Default_validator_messages_are_persian_with_persian_field_names()
    {
        PersianValidation.Configure();

        var result = await new PostInventoryDocValidator().ValidateAsync(new PostInventoryDocCommand { Id = 0, RowVersion = "x" });

        var message = Assert.Single(result.Errors).ErrorMessage;
        Assert.Contains("شناسه", message);
        Assert.DoesNotContain("must", message);
    }

    private sealed record ProblemBody(
        int Status, string Title, string Detail, string Code, string Message, string[] Messages,
        Dictionary<string, string[]>? Errors, string TraceId);

    private static async Task<ProblemBody> Handle(Exception exception) => (await HandleWithResponse(exception)).Body;

    private static async Task<(ProblemBody Body, HttpResponse Response)> HandleWithResponse(Exception exception)
    {
        var services = new ServiceCollection()
            .AddLogging()
            .AddProblemDetails(o => o.CustomizeProblemDetails = ApiProblem.Customize)
            .BuildServiceProvider();

        var http = new DefaultHttpContext { RequestServices = services };
        http.Request.Headers.Accept = "application/json";
        http.Response.Body = new MemoryStream();

        var handler = new GlobalExceptionHandler(services.GetRequiredService<Microsoft.AspNetCore.Http.IProblemDetailsService>(), NullLogger<GlobalExceptionHandler>.Instance);
        Assert.True(await handler.TryHandleAsync(http, exception, default));

        http.Response.Body.Position = 0;
        var body = await JsonSerializer.DeserializeAsync<ProblemBody>(http.Response.Body, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        return (body!, http.Response);
    }
}
