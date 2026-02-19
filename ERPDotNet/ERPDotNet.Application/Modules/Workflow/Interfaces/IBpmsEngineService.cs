using ERPDotNet.Application.Modules.Workflow.Contracts;

namespace ERPDotNet.Application.Modules.Workflow.Interfaces;

public interface IBpmsEngineService
{
    Task<long> StartProcessAsync(StartProcessRequest request, CancellationToken cancellationToken);

    Task ExecuteTransitionAsync(ExecuteTransitionRequest request, CancellationToken cancellationToken);
}