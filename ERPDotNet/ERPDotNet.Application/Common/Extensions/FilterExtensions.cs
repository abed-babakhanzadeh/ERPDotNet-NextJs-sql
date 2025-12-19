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
            // منطق پیش‌فرض AND است
            var logic = group.First().Logic?.ToLower() ?? "and";
            var parameter = Expression.Parameter(typeof(T), "x");

            Expression? combinedExpression = null;

            foreach (var filter in group)
            {
                // ۱. نرمال‌سازی عملگر: حذف فاصله و تبدیل به حروف کوچک
                var op = filter.Operation?.Trim().ToLowerInvariant();
                
                if (string.IsNullOrEmpty(op)) continue;
                
                // اگر ولیو خالی است (مگر برای شرط‌های خالی بودن) رد شو
                if (string.IsNullOrEmpty(filter.Value) && 
                    op != "isempty" && op != "isnotempty")
                    continue;

                try
                {
                    // ۲. دسترسی به پراپرتی (Nested Properties)
                    Expression propertyAccess = parameter;
                    foreach (var member in propertyName.Split('.'))
                    {
                        propertyAccess = Expression.PropertyOrField(propertyAccess, member);
                    }

                    var targetType = Nullable.GetUnderlyingType(propertyAccess.Type) ?? propertyAccess.Type;
                    Expression comparison = null!;

                    // =========================================================
                    // بخش جدید: لاجیک هوشمند برای ENUM (جستجو در متن فارسی)
                    // =========================================================
                    if (targetType.IsEnum && (op == "contains" || op == "eq" || op == "equals"))
                    {
                        // 1. پیدا کردن تمام مقادیر Enum که عنوان فارسی‌شان (Display) شامل متن کاربر است
                        var matchingValues = Enum.GetValues(targetType)
                            .Cast<Enum>()
                            .Where(e => e.ToDisplay().Contains(filter.Value, StringComparison.OrdinalIgnoreCase))
                            .Select(e => Convert.ChangeType(e, targetType)) // تبدیل به آبجکت اصلی Enum
                            .ToList();

                        if (!matchingValues.Any())
                        {
                            // اگر هیچی پیدا نشد، یک شرط همیشه غلط بساز (1 == 0) تا نتیجه‌ای نیاید
                            comparison = Expression.Equal(Expression.Constant(1), Expression.Constant(0));
                        }
                        else
                        {
                            // اگر پیدا شد، باید بگوییم: (Type == Val1 OR Type == Val2 OR ...)
                            Expression? enumOrExpr = null;
                            foreach (var match in matchingValues)
                            {
                                // دقت کنید: propertyAccess باید به نوع نال‌پذیر تبدیل شود اگر لازم است
                                // اما چون مقایسه مستقیم است، معمولاً Constant را به نوع پراپرتی تبدیل می‌کنیم
                                var constantVal = Expression.Constant(match, propertyAccess.Type); // هندل کردن نال‌پذیری
                                var eq = Expression.Equal(propertyAccess, constantVal);
                                
                                enumOrExpr = enumOrExpr == null ? eq : Expression.OrElse(enumOrExpr, eq);
                            }
                            comparison = enumOrExpr!;
                        }
                    }
                    else
                    {
                        // =========================================================
                        // بخش استاندارد: لاجیک قبلی برای سایر تایپ‌ها (String, Int, Date...)
                        // =========================================================

                        // تابع تبدیل مقدار
                        object? GetConvertedValue(string? val)
                        {
                            if (string.IsNullOrEmpty(val)) return null;
                            try
                            {
                                if (targetType == typeof(bool)) return bool.Parse(val);
                                if (targetType.IsEnum) return Enum.Parse(targetType, val); // برای وقتی که عدد مستقیم می‌فرستند
                                if (targetType == typeof(Guid)) return Guid.Parse(val);
                                if (targetType == typeof(DateTime)) return DateTime.Parse(val);
                                return Convert.ChangeType(val, targetType);
                            }
                            catch { return null; }
                        }

                        // آماده‌سازی مقدار ثابت (Constant)
                        Expression constant = null!;
                        if (op != "isempty" && op != "isnotempty")
                        {
                            var val1 = GetConvertedValue(filter.Value);
                            if (val1 != null)
                                constant = Expression.Constant(val1, propertyAccess.Type);
                            else
                                continue; // اگر تبدیل مقدار فیل شد، از این فیلتر بگذر
                        }

                        // ۳. سوئیچ روی تمام حالت‌ها
                        switch (op)
                        {
                            // --- String Contains ---
                            case "contains":
                                if (targetType == typeof(string))
                                {
                                    var method = typeof(string).GetMethod("Contains", new[] { typeof(string) });
                                    var notNull = Expression.NotEqual(propertyAccess, Expression.Constant(null));
                                    var methodCall = Expression.Call(propertyAccess, method!, Expression.Constant(filter.Value));
                                    comparison = Expression.AndAlso(notNull, methodCall);
                                }
                                break;

                            case "notcontains":
                                if (targetType == typeof(string))
                                {
                                    var method = typeof(string).GetMethod("Contains", new[] { typeof(string) });
                                    // منطق: (x == null) OR (!x.Contains(val))
                                    var isNull = Expression.Equal(propertyAccess, Expression.Constant(null));
                                    var methodCall = Expression.Call(propertyAccess, method!, Expression.Constant(filter.Value));
                                    var notContains = Expression.Not(methodCall);
                                    comparison = Expression.OrElse(isNull, notContains);
                                }
                                else
                                {
                                    comparison = Expression.NotEqual(propertyAccess, constant);
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

                            // --- Equality ---
                            case "equals":
                            case "eq":
                                if (targetType == typeof(DateTime))
                                {
                                    // برای تاریخ، بهتر است فقط قسمت Date مقایسه شود (یا بازه یک روزه)
                                    // اما برای سادگی اینجا تساوی دقیق را نگه می‌داریم، یا می‌توانید لاجیک SARGable که قبلا گفتم را بگذارید
                                    // اینجا لاجیک ساده:
                                    var dateProperty = Expression.Property(propertyAccess, nameof(DateTime.Date));
                                    var valDate = ((DateTime)GetConvertedValue(filter.Value)!).Date;
                                    comparison = Expression.Equal(dateProperty, Expression.Constant(valDate));
                                }
                                else
                                {
                                    comparison = Expression.Equal(propertyAccess, constant);
                                }
                                break;

                            case "neq":
                            case "notequals":
                                if (targetType == typeof(DateTime))
                                {
                                    var dateProperty = Expression.Property(propertyAccess, nameof(DateTime.Date));
                                    var valDate = ((DateTime)GetConvertedValue(filter.Value)!).Date;
                                    comparison = Expression.NotEqual(dateProperty, Expression.Constant(valDate));
                                }
                                else
                                {
                                    var notEq = Expression.NotEqual(propertyAccess, constant);
                                    var isNull = Expression.Equal(propertyAccess, Expression.Constant(null));
                                    comparison = Expression.OrElse(notEq, isNull);
                                }
                                break;

                            // --- Comparison ---
                            case "gt":
                            case "after":
                                comparison = Expression.GreaterThan(propertyAccess, constant);
                                break;

                            case "gte":
                                comparison = Expression.GreaterThanOrEqual(propertyAccess, constant);
                                break;

                            case "lt":
                            case "before":
                                comparison = Expression.LessThan(propertyAccess, constant);
                                break;

                            case "lte":
                                comparison = Expression.LessThanOrEqual(propertyAccess, constant);
                                break;

                            // --- Range ---
                            case "between":
                            case "notbetween":
                                if (!string.IsNullOrEmpty(filter.Value2))
                                {
                                    var val2 = GetConvertedValue(filter.Value2);
                                    if (val2 != null)
                                    {
                                        var constant2 = Expression.Constant(val2, propertyAccess.Type);
                                        var greaterThan = Expression.GreaterThanOrEqual(propertyAccess, constant);
                                        var lessThan = Expression.LessThanOrEqual(propertyAccess, constant2);
                                        var betweenExpr = Expression.AndAlso(greaterThan, lessThan);

                                        if (op == "notbetween")
                                            comparison = Expression.Not(betweenExpr);
                                        else
                                            comparison = betweenExpr;
                                    }
                                }
                                break;

                            // --- Null Check ---
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
                        {
                            if (logic == "or")
                                combinedExpression = Expression.OrElse(combinedExpression, comparison);
                            else
                                combinedExpression = Expression.AndAlso(combinedExpression, comparison);
                        }
                    }
                }
                catch
                {
                    // اگر خطایی در ساخت اکسپرشن بود (مثلاً تایپ اشتباه)، از این فیلتر می‌گذریم
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
}