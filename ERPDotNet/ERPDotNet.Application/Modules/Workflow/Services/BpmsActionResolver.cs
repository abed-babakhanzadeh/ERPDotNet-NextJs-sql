using ERPDotNet.Application.Modules.Workflow.Contracts;
using Microsoft.Extensions.DependencyInjection;

namespace ERPDotNet.Application.Modules.Workflow.Services;

public class BpmsActionResolver : IBpmsActionResolver
{
    private readonly IServiceProvider _serviceProvider;

    public BpmsActionResolver(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public IBpmsActionHandler? Resolve(string actionCode)
    {
        if (string.IsNullOrWhiteSpace(actionCode)) 
            return null;

        // 🌟 استفاده از قابلیت Keyed Services در .NET 8 برای لود داینامیک کلاس‌ها بدون Reflection
        return _serviceProvider.GetKeyedService<IBpmsActionHandler>(actionCode);
    }
}