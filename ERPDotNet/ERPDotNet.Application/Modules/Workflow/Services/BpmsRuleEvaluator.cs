using System.Globalization;
using ERPDotNet.Application.Common.Exceptions; // 🌟 اضافه شود
using ERPDotNet.Application.Modules.Workflow.Interfaces;
using ERPDotNet.Domain.Modules.Workflow.Entities;

namespace ERPDotNet.Application.Modules.Workflow.Services;

public class BpmsRuleEvaluator : IBpmsRuleEvaluator
{
    public bool Evaluate(
        IReadOnlyCollection<BpmsTransitionRule> rules, 
        IReadOnlyDictionary<string, object?> variables)
    {
        if (rules == null || !rules.Any()) return true; 

        foreach (var rule in rules)
        {
            if (!EvaluateSingleRule(rule, variables)) return false; 
        }

        return true;
    }

    private bool EvaluateSingleRule(BpmsTransitionRule rule, IReadOnlyDictionary<string, object?> variables)
    {
        string op = rule.Operator?.Trim().ToLowerInvariant() ?? "==";

        if (!variables.TryGetValue(rule.VariableName, out var variableValue) || variableValue == null)
        {
            if ((op == "==" || op == "eq") && (rule.Value == "null" || string.IsNullOrWhiteSpace(rule.Value))) return true;
            if ((op == "!=" || op == "neq") && !string.IsNullOrWhiteSpace(rule.Value) && rule.Value != "null") return true;

            return false; 
        }

        string targetValueStr = rule.Value ?? string.Empty;

        if (IsNumeric(variableValue))
        {
            return EvaluateNumeric(Convert.ToDecimal(variableValue, CultureInfo.InvariantCulture), op, targetValueStr);
        }

        if (variableValue is bool bVal)
        {
            if (bool.TryParse(targetValueStr, out bool targetBool))
            {
                return op switch
                {
                    "==" or "eq" => bVal == targetBool,
                    "!=" or "neq" => bVal != targetBool,
                    // 🌟 جلوگیری از خطای خاموش
                    _ => throw new BusinessRuleException($"عملگر '{op}' برای مقایسه منطقی (Boolean) نامعتبر است.")
                };
            }
            return false;
        }

        if (variableValue is DateTime dtVal)
        {
            if (DateTime.TryParse(targetValueStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime targetDt))
            {
                 return op switch
                 {
                     "==" or "eq" => dtVal.Date == targetDt.Date,
                     "!=" or "neq" => dtVal.Date != targetDt.Date,
                     ">" or "gt" => dtVal > targetDt,
                     ">=" or "gte" => dtVal >= targetDt,
                     "<" or "lt" => dtVal < targetDt,
                     "<=" or "lte" => dtVal <= targetDt,
                     // 🌟 جلوگیری از خطای خاموش
                     _ => throw new BusinessRuleException($"عملگر '{op}' برای مقایسه تاریخ نامعتبر است.")
                 };
            }
            return false;
        }

        string sVal = variableValue.ToString() ?? string.Empty;
        return op switch
        {
            "==" or "eq" => sVal.Equals(targetValueStr, StringComparison.OrdinalIgnoreCase),
            "!=" or "neq" => !sVal.Equals(targetValueStr, StringComparison.OrdinalIgnoreCase),
            "contains" => sVal.Contains(targetValueStr, StringComparison.OrdinalIgnoreCase),
            "startswith" => sVal.StartsWith(targetValueStr, StringComparison.OrdinalIgnoreCase),
            "endswith" => sVal.EndsWith(targetValueStr, StringComparison.OrdinalIgnoreCase),
            // 🌟 جلوگیری از خطای خاموش
            _ => throw new BusinessRuleException($"عملگر '{op}' برای مقایسه رشته‌ای (متن) نامعتبر است.")
        };
    }

    private bool EvaluateNumeric(decimal variableValue, string op, string targetValueStr)
    {
        if (!decimal.TryParse(targetValueStr, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal targetValue)) 
            return false;

        return op switch
        {
            "==" or "eq" => variableValue == targetValue,
            "!=" or "neq" => variableValue != targetValue,
            ">" or "gt" => variableValue > targetValue,
            ">=" or "gte" => variableValue >= targetValue,
            "<" or "lt" => variableValue < targetValue,
            "<=" or "lte" => variableValue <= targetValue,
            // 🌟 جلوگیری از خطای خاموش
            _ => throw new BusinessRuleException($"عملگر '{op}' برای مقایسه عددی نامعتبر است.")
        };
    }

    private bool IsNumeric(object value)
    {
        return value is sbyte or byte or short or ushort or int or uint or long or ulong or float or double or decimal;
    }
}