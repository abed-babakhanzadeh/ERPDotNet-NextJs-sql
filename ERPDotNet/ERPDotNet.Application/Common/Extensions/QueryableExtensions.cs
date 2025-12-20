using ERPDotNet.Application.Common.Models;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using System.Reflection;

namespace ERPDotNet.Application.Common.Extensions;

public static class QueryableExtensions
{
    public static Task<PaginatedResult<T>> ToPaginatedListAsync<T>(
        this IQueryable<T> source, 
        int pageNumber, 
        int pageSize, 
        CancellationToken cancellationToken = default)
    {
        return PaginatedResult<T>.CreateAsync(source, pageNumber, pageSize, cancellationToken);
    }

    public static IQueryable<T> OrderByNatural<T>(this IQueryable<T> query, string orderByMember, bool descending)
    {
        var param = Expression.Parameter(typeof(T), "x");
        
        // 1. دسترسی به پراپرتی
        Expression body = param;
        foreach (var member in orderByMember.Split('.'))
        {
            body = Expression.PropertyOrField(body, member);
        }

        // هندل کردن Nullable
        bool isNullable = body.Type.IsClass || Nullable.GetUnderlyingType(body.Type) != null;
        IQueryable<T> orderedQuery = query;

        // اگر نال‌پذیر است، نال‌ها را به ته لیست بفرست
        if (isNullable)
        {
            var nullCheck = Expression.Equal(body, Expression.Constant(null));
            var nullOrder = Expression.Condition(nullCheck, Expression.Constant(1), Expression.Constant(0));
            
            var lambda = Expression.Lambda(nullOrder, param);
            
            var method = typeof(Queryable).GetMethods()
                .First(m => m.Name == "OrderBy" && m.GetParameters().Length == 2)
                .MakeGenericMethod(typeof(T), typeof(int));
                
            orderedQuery = (IQueryable<T>)method.Invoke(null, new object[] { query, lambda })!;
        }

        // 2. منطق Natural Sort (اصلاح شده و اصولی)
        if (body.Type == typeof(string) && 
           (orderByMember.EndsWith("Code", StringComparison.OrdinalIgnoreCase) || 
            orderByMember.EndsWith("Number", StringComparison.OrdinalIgnoreCase)))
        {
            // الف) دسترسی به EF.Functions
            var efFunctions = Expression.Property(null, typeof(EF), nameof(EF.Functions));
            
            // ب) تعریف الگوی "فقط عدد": "%[^0-9]%" یعنی "چیزی که عدد نیست"
            // اگر رشته شامل "چیزی که عدد نیست" باشد، پس عددی نیست.
            // !Like(str, "%[^0-9]%") === IsNumeric
            var likeMethod = typeof(DbFunctionsExtensions).GetMethod(nameof(DbFunctionsExtensions.Like), 
                new[] { typeof(DbFunctions), typeof(string), typeof(string) })!;
            
            var isNumericExpression = Expression.Not(
                Expression.Call(likeMethod, efFunctions, body, Expression.Constant("%[^0-9]%"))
            );

            // ج) محاسبه طول (فقط برای اعداد مهم است)
            var lengthExpression = Expression.Property(body, "Length");

            // د) لاجیک سورت اولیه:
            // اگر عدد است: طولش را برگردان.
            // اگر عدد نیست: 0 (یا یک عدد ثابت) برگردان تا با طول سورت نشود.
            var sortKeyExpression = Expression.Condition(
                isNumericExpression,
                lengthExpression,
                Expression.Constant(0)
            );

            var sortKeyLambda = Expression.Lambda(sortKeyExpression, param);

            // اعمال سورت اولیه (بر اساس طول فقط برای اعداد)
            string firstMethod = orderedQuery == query 
                ? (descending ? "OrderByDescending" : "OrderBy")
                : (descending ? "ThenByDescending" : "ThenBy");

            var firstCall = Expression.Call(
                typeof(Queryable),
                firstMethod,
                new Type[] { typeof(T), typeof(int) },
                orderedQuery.Expression,
                Expression.Quote(sortKeyLambda)
            );

            orderedQuery = query.Provider.CreateQuery<T>(firstCall);
        }

        // 3. سورت نهایی (الفبایی)
        // این سورت همیشه اجرا می‌شود تا ترتیب نهایی درست باشد
        // (برای اعداد هم بعد از سورت طول، مقدارشان سورت می‌شود که صحیح است)
        LambdaExpression keySelector = Expression.Lambda(body, param);
        
        string finalMethod = orderedQuery == query 
            ? (descending ? "OrderByDescending" : "OrderBy") 
            : (descending ? "ThenByDescending" : "ThenBy"); // همیشه ThenBy چون مرحله قبل انجام شده

        var finalExpression = Expression.Call(
            typeof(Queryable),
            finalMethod,
            new Type[] { typeof(T), keySelector.ReturnType }, 
            orderedQuery.Expression,
            Expression.Quote(keySelector));

        return query.Provider.CreateQuery<T>(finalExpression);
    }
}