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
            _data[kvp.Key] = kvp.Value;
        }
    }

    public object? GetVariable(string key)
    {
        return _data.TryGetValue(key, out var val) ? val : null;
    }
}