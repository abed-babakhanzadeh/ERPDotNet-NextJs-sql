namespace ERPDotNet.Application.Modules.Workflow.Contracts;

public interface IBpmsActionHandler
{
    // اجرای منطق تجاری (مثلاً تایید نهایی سند و کسر موجودی)
    Task ExecuteAsync(BpmsActionContext context, CancellationToken cancellationToken);
}