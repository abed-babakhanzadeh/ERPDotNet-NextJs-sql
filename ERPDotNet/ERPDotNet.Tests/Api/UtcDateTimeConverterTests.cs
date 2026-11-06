using System.Text.Json;
using ERPDotNet.API.Serialization;

namespace ERPDotNet.Tests.Api;

public class UtcDateTimeConverterTests
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new UtcDateTimeConverter() }
    };

    private sealed record TaskRow(DateTime CreatedAt, DateTime? DueDate);

    [Fact]
    public void Time_read_from_database_is_written_as_utc()
    {
        // EF زمان‌ها را بدون Kind می‌خواند
        var stored = new DateTime(2026, 11, 6, 19, 23, 48, DateTimeKind.Unspecified);

        var json = JsonSerializer.Serialize(new TaskRow(stored, stored), Options);

        Assert.Equal("""{"createdAt":"2026-11-06T19:23:48Z","dueDate":"2026-11-06T19:23:48Z"}""", json);
    }

    [Fact]
    public void Missing_nullable_time_stays_null()
    {
        var json = JsonSerializer.Serialize(new TaskRow(DateTime.UnixEpoch, null), Options);

        Assert.Contains("\"dueDate\":null", json);
    }

    [Theory]
    [InlineData("\"2026-11-06T08:30:00.000Z\"")]
    [InlineData("\"2026-11-06T12:00:00+03:30\"")]
    [InlineData("\"2026-11-06T08:30:00\"")]
    public void Input_is_stored_as_utc(string input)
    {
        var value = JsonSerializer.Deserialize<DateTime>(input, Options);

        Assert.Equal(DateTimeKind.Utc, value.Kind);
        Assert.Equal(new DateTime(2026, 11, 6, 8, 30, 0, DateTimeKind.Utc), value);
    }
}
