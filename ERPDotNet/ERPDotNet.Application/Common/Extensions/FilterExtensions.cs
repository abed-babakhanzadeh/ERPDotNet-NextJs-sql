using ERPDotNet.Application.Common.Models;
using System.Linq.Expressions;
using System.Reflection;

namespace ERPDotNet.Application.Common.Extensions;

public static class FilterExtensions
{
    public static IQueryable<T> ApplyDynamicFilters<T>(this IQueryable<T> query, List<FilterModel>? filters)
    {
        if (filters == null || !filters.Any())
            return query;

        var groupedFilters = filters.GroupBy(f => f.PropertyName);

        foreach (var group in groupedFilters)
        {
            var propertyName = group.Key;
            if (string.IsNullOrWhiteSpace(propertyName)) continue;

            // منطق پیش‌فرض AND است
            var logic = group.First().Logic?.ToLower() ?? "and";
            var parameter = Expression.Parameter(typeof(T), "x");

            Expression? combinedExpression = null;

            foreach (var filter in group)
            {
                // ۱. نرمال‌سازی عملگر
                var op = filter.Operation?.Trim().ToLowerInvariant();
                if (string.IsNullOrEmpty(op)) continue;
                
                // رد شدن از مقادیر خالی (مگر برای isempty/isnotempty)
                if (string.IsNullOrEmpty(filter.Value) && op != "isempty" && op != "isnotempty")
                    continue;

                try
                {
                    // ۲. دسترسی به پراپرتی (بدون حساسیت به حروف بزرگ و کوچک)
                    Expression propertyAccess = parameter;
                    foreach (var member in propertyName.Split('.'))
                    {
                        var propertyInfo = propertyAccess.Type.GetProperty(member, BindingFlags.IgnoreCase | BindingFlags.Public | BindingFlags.Instance);
                        if (propertyInfo != null)
                        {
                            propertyAccess = Expression.Property(propertyAccess, propertyInfo);
                        }
                        else
                        {
                            // فال‌بک برای حالتی که با GetProperty پیدا نشد
                            propertyAccess = Expression.PropertyOrField(propertyAccess, member);
                        }
                    }

                    var targetType = Nullable.GetUnderlyingType(propertyAccess.Type) ?? propertyAccess.Type;
                    Expression? comparison = null;

                    // =========================================================
                    // هندل کردن فیلتر برای نوع Enum (جستجوی متنی)
                    // =========================================================
                    if (targetType.IsEnum && (op == "contains" || op == "eq" || op == "equals" || op == "="))
                    {
                        var matchingValues = Enum.GetValues(targetType)
                            .Cast<Enum>()
                            .Where(e => e.ToDisplay().Contains(filter.Value ?? "", StringComparison.OrdinalIgnoreCase))
                            .Select(e => Convert.ChangeType(e, targetType))
                            .ToList();

                        if (!matchingValues.Any())
                        {
                            comparison = Expression.Equal(Expression.Constant(1), Expression.Constant(0)); // False condition
                        }
                        else
                        {
                            Expression? enumOrExpr = null;
                            foreach (var match in matchingValues)
                            {
                                var constantVal = Expression.Constant(match, propertyAccess.Type);
                                var eq = Expression.Equal(propertyAccess, constantVal);
                                enumOrExpr = enumOrExpr == null ? eq : Expression.OrElse(enumOrExpr, eq);
                            }
                            comparison = enumOrExpr;
                        }
                    }
                    else
                    {
                        // =========================================================
                        // هندل کردن فیلتر برای سایر انواع (String, Number, Date, ...)
                        // =========================================================
                        object? parsedValue = null;
                        Expression? constant = null;

                        if (op != "isempty" && op != "isnotempty")
                        {
                            parsedValue = GetConvertedValue(filter.Value, targetType);
                            if (parsedValue == null) continue; // اگر مقدار نامعتبر بود رد شو
                            
                            constant = Expression.Constant(parsedValue, propertyAccess.Type);
                        }

                        switch (op)
                        {
                            case "contains":
                                if (targetType == typeof(string))
                                {
                                    var method = typeof(string).GetMethod("Contains", new[] { typeof(string) });
                                    var notNull = Expression.NotEqual(propertyAccess, Expression.Constant(null));
                                    var methodCall = Expression.Call(propertyAccess, method!, Expression.Constant(filter.Value));
                                    comparison = Expression.AndAlso(notNull, methodCall);
                                }
                                else
                                {
                                    // ✨ اصلاح طلایی: پیدا کردن متد ToString مختص همان تایپ (جلوگیری از کرش Expression)
                                    var toStringMethod = propertyAccess.Type.GetMethod("ToString", Type.EmptyTypes) 
                                                        ?? typeof(object).GetMethod("ToString");
                                                        
                                    var toStringCall = Expression.Call(propertyAccess, toStringMethod!);
                                    var containsMethod = typeof(string).GetMethod("Contains", new[] { typeof(string) });
                                    comparison = Expression.Call(toStringCall, containsMethod!, Expression.Constant(filter.Value));
                                }
                                break;

                            case "notcontains":
                                if (targetType == typeof(string))
                                {
                                    var method = typeof(string).GetMethod("Contains", new[] { typeof(string) });
                                    var isNull = Expression.Equal(propertyAccess, Expression.Constant(null));
                                    var methodCall = Expression.Call(propertyAccess, method!, Expression.Constant(filter.Value));
                                    var notContains = Expression.Not(methodCall);
                                    comparison = Expression.OrElse(isNull, notContains);
                                }
                                else
                                {
                                    var toStringMethod = propertyAccess.Type.GetMethod("ToString", Type.EmptyTypes) 
                                                        ?? typeof(object).GetMethod("ToString");
                                                        
                                    var toStringCall = Expression.Call(propertyAccess, toStringMethod!);
                                    var containsMethod = typeof(string).GetMethod("Contains", new[] { typeof(string) });
                                    var methodCall = Expression.Call(toStringCall, containsMethod!, Expression.Constant(filter.Value));
                                    comparison = Expression.Not(methodCall);
                                }
                                break;

                            case "startswith":
                                if (targetType == typeof(string))
                                {
                                    var notNull = Expression.NotEqual(propertyAccess, Expression.Constant(null));
                                    var method = typeof(string).GetMethod("StartsWith", new[] { typeof(string) });
                                    comparison = Expression.AndAlso(notNull, Expression.Call(propertyAccess, method!, Expression.Constant(filter.Value)));
                                }
                                break;

                            case "endswith":
                                if (targetType == typeof(string))
                                {
                                    var notNull = Expression.NotEqual(propertyAccess, Expression.Constant(null));
                                    var method = typeof(string).GetMethod("EndsWith", new[] { typeof(string) });
                                    comparison = Expression.AndAlso(notNull, Expression.Call(propertyAccess, method!, Expression.Constant(filter.Value)));
                                }
                                break;

                            case "equals": case "eq": case "=":
                                if (constant != null) comparison = Expression.Equal(propertyAccess, constant);
                                break;

                            case "neq": case "notequals": case "!=": case "not":
                                if (constant != null)
                                {
                                    var notEq = Expression.NotEqual(propertyAccess, constant);
                                    var isNull = Expression.Equal(propertyAccess, Expression.Constant(null));
                                    comparison = Expression.OrElse(notEq, isNull);
                                }
                                break;

                            case "gt": case "greaterthan": case ">": case "after":
                                if (constant != null) comparison = Expression.GreaterThan(propertyAccess, constant);
                                break;

                            case "gte": case "greaterthanorequal": case ">=":
                                if (constant != null) comparison = Expression.GreaterThanOrEqual(propertyAccess, constant);
                                break;

                            case "lt": case "lessthan": case "<": case "before":
                                if (constant != null) comparison = Expression.LessThan(propertyAccess, constant);
                                break;

                            case "lte": case "lessthanorequal": case "<=":
                                if (constant != null) comparison = Expression.LessThanOrEqual(propertyAccess, constant);
                                break;

                            case "between": case "notbetween":
                                if (!string.IsNullOrEmpty(filter.Value2))
                                {
                                    var val2 = GetConvertedValue(filter.Value2, targetType);
                                    if (val2 != null && constant != null)
                                    {
                                        var constant2 = Expression.Constant(val2, propertyAccess.Type);
                                        var greaterThan = Expression.GreaterThanOrEqual(propertyAccess, constant);
                                        var lessThan = Expression.LessThanOrEqual(propertyAccess, constant2);
                                        var betweenExpr = Expression.AndAlso(greaterThan, lessThan);

                                        comparison = op == "notbetween" ? Expression.Not(betweenExpr) : betweenExpr;
                                    }
                                }
                                break;

                            case "isempty":
                                if (targetType == typeof(string))
                                {
                                    var method = typeof(string).GetMethod("IsNullOrEmpty");
                                    comparison = Expression.Call(method!, propertyAccess);
                                }
                                else
                                {
                                    comparison = Expression.Equal(propertyAccess, Expression.Constant(null));
                                }
                                break;

                            case "isnotempty":
                                if (targetType == typeof(string))
                                {
                                    var method = typeof(string).GetMethod("IsNullOrEmpty");
                                    comparison = Expression.Not(Expression.Call(method!, propertyAccess));
                                }
                                else
                                {
                                    comparison = Expression.NotEqual(propertyAccess, Expression.Constant(null));
                                }
                                break;
                        }
                    }

                    // ۴. ترکیب شرط‌ها (AND / OR)
                    if (comparison != null)
                    {
                        if (combinedExpression == null)
                            combinedExpression = comparison;
                        else
                            combinedExpression = logic == "or" 
                                ? Expression.OrElse(combinedExpression, comparison) 
                                : Expression.AndAlso(combinedExpression, comparison);
                    }
                }
                catch
                {
                    continue;
                }
            }

            if (combinedExpression != null)
            {
                var lambda = Expression.Lambda<Func<T, bool>>(combinedExpression, parameter);
                query = query.Where(lambda);
            }
        }

        return query;
    }

    // متد کمکی برای پارس کردن مقادیر و حل مشکل اعداد فارسی و اعشار
    private static object? GetConvertedValue(string? val, Type targetType)
    {
        if (string.IsNullOrWhiteSpace(val)) return null;
        try
        {
            val = val.Replace("۰", "0").Replace("۱", "1").Replace("۲", "2").Replace("۳", "3").Replace("۴", "4")
                     .Replace("۵", "5").Replace("۶", "6").Replace("۷", "7").Replace("۸", "8").Replace("۹", "9")
                     .Replace("/", ".");

            if (targetType == typeof(bool)) return bool.Parse(val);
            if (targetType.IsEnum) return Enum.Parse(targetType, val);
            if (targetType == typeof(Guid)) return Guid.Parse(val);
            
            // ✨ خط قبلی حذف شد و فقط این بلاک باقی ماند
            if (targetType == typeof(DateTime) || targetType == typeof(DateTime?))
            {
                var parts = val.Split('/');
                if (parts.Length == 3 && int.TryParse(parts[0], out int year) && year >= 1300 && year <= 1500)
                {
                    var pc = new System.Globalization.PersianCalendar();
                    return pc.ToDateTime(year, int.Parse(parts[1]), int.Parse(parts[2]), 0, 0, 0, 0);
                }
                return DateTime.Parse(val);
            }

            return Convert.ChangeType(val, targetType, System.Globalization.CultureInfo.InvariantCulture);
        }
        catch
        {
            return null;
        }
    }
}