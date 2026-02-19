using ERPDotNet.Domain.Modules.Workflow.Entities;

namespace ERPDotNet.Application.Modules.Workflow.Interfaces;

public interface IBpmsRuleEvaluator
{
    bool Evaluate(
        IReadOnlyCollection<BpmsTransitionRule> rules, 
        IReadOnlyDictionary<string, object?> variables); // 🌟 پشتیبانی از null
}