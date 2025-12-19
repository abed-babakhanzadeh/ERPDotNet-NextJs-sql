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
        
        // 1. دسترسی به پراپرتی (پشتیبانی از Nested مثل Unit.Title)
        Expression body = param;
        foreach (var member in orderByMember.Split('.'))
        {
            body = Expression.PropertyOrField(body, member);
        }

        // 2. هندل کردن Nullable (نال‌ها همیشه آخر)
        // در SQL Server رفتار پیش‌فرض نال‌ها با پستگرس فرق دارد. این کد یکسان‌سازی می‌کند.
        bool isNullable = body.Type.IsClass || Nullable.GetUnderlyingType(body.Type) != null;
        IQueryable<T> orderedQuery = query;
        bool isOrdered = false;

        if (isNullable)
        {
            // نال‌ها را 1 و غیر نال‌ها را 0 در نظر می‌گیریم -> سورت صعودی -> نال‌ها آخر می‌روند
            var nullCheckExpression = Expression.Condition(
                Expression.Equal(body, Expression.Constant(null)),
                Expression.Constant(1),
                Expression.Constant(0)
            );
            
            var nullCheckLambda = Expression.Lambda(nullCheckExpression, param);
            
            var resultExpression = Expression.Call(
                typeof(Queryable),
                "OrderBy", // همیشه صعودی برای نال چک
                new Type[] { typeof(T), typeof(int) },
                query.Expression,
                Expression.Quote(nullCheckLambda)
            );

            orderedQuery = query.Provider.CreateQuery<T>(resultExpression);
            isOrdered = true;
        }

        // 3. اعمال Collation فارسی برای رشته‌ها
        LambdaExpression keySelector;
        if (body.Type == typeof(string))
        {
            // استفاده از EF.Functions.Collate برای SQL Server
            // Collation: Persian_100_CI_AI
            // CI: Case Insensitive (حساس نبودن به بزرگی کوچکی حروف انگلیسی)
            // AI: Accent Insensitive (حساس نبودن به اعراب عربی/فارسی - جستجوی "آ" و "ا" یکسان)
            var efFunctions = Expression.Property(null, typeof(EF), nameof(EF.Functions));
            
            var collateMethod = typeof(RelationalDbFunctionsExtensions)
                .GetMethod(nameof(RelationalDbFunctionsExtensions.Collate), 
                    new[] { typeof(DbFunctions), typeof(string), typeof(string) });

            if (collateMethod != null)
            {
                var collateCall = Expression.Call(
                    collateMethod,
                    efFunctions, 
                    body, 
                    Expression.Constant("Persian_100_CI_AI") 
                );
                keySelector = Expression.Lambda(collateCall, param);
            }
            else
            {
                // فال‌بک در صورت پیدا نشدن متد
                keySelector = Expression.Lambda(body, param);
            }
        }
        else
        {
            keySelector = Expression.Lambda(body, param);
        }

        // 4. تعیین متد OrderBy یا ThenBy
        string methodName = isOrdered 
            ? (descending ? "ThenByDescending" : "ThenBy") 
            : (descending ? "OrderByDescending" : "OrderBy");

        var finalExpression = Expression.Call(
            typeof(Queryable),
            methodName,
            new Type[] { typeof(T), keySelector.ReturnType }, // استفاده از ReturnType داینامیک
            orderedQuery.Expression,
            Expression.Quote(keySelector));

        return query.Provider.CreateQuery<T>(finalExpression);
    }
}