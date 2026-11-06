using System.Text.Json;
using System.Text.Json.Serialization;

namespace ERPDotNet.API.Serialization;

// همه زمان‌ها در دیتابیس UTC ذخیره می‌شوند، ولی EF آن‌ها را با Kind=Unspecified می‌خواند و
// بدون «Z» سریال می‌شدند؛ مرورگر هم آن‌ها را ساعت محلی فرض می‌کرد (در ایران ۳.۵ ساعت جابه‌جا).
// خروجی همیشه با «Z» نوشته می‌شود و ورودی دارای offset هم به UTC برمی‌گردد.
public sealed class UtcDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => ToUtc(reader.GetDateTime());

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
        => writer.WriteStringValue(ToUtc(value));

    private static DateTime ToUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
    };
}
