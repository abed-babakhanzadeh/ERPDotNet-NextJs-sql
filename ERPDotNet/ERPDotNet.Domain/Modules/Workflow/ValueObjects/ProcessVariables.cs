using System.Text.Json;

namespace ERPDotNet.Domain.Modules.Workflow.ValueObjects;

public class ProcessVariables
{
    private readonly Dictionary<string, object?> _data = new();

    // 🌟 خروجی فقط خواندنی (ReadOnly) برای امنیت دامین
    public IReadOnlyDictionary<string, object?> Data => _data;

    public void SetVariables(Dictionary<string, object?>? newVariables)
    {
        if (newVariables == null) return;

        foreach (var kvp in newVariables)
        {
            _data[kvp.Key] = Normalize(kvp.Value);
        }
    }

    public object? GetVariable(string key)
    {
        return _data.TryGetValue(key, out var val) ? val : null;
    }

    // مقادیری که از بدنه JSON درخواست می‌آیند JsonElement هستند؛ بدون تبدیل، قوانین عددی/منطقی
    // آن‌ها را رشته می‌بینند و مقایسه‌ای مثل Amount > 1000 خطا می‌دهد
    private static object? Normalize(object? value)
    {
        if (value is not JsonElement element) return value;

        switch (element.ValueKind)
        {
            case JsonValueKind.Number:
                if (element.TryGetInt64(out long l)) return l;
                if (element.TryGetDecimal(out decimal d)) return d;
                return element.GetDouble();
            case JsonValueKind.True: return true;
            case JsonValueKind.False: return false;
            case JsonValueKind.String:
                if (element.TryGetDateTime(out DateTime dt)) return dt;
                return element.GetString();
            case JsonValueKind.Null:
            case JsonValueKind.Undefined:
                return null;
            default: return element.GetRawText();
        }
    }
}
