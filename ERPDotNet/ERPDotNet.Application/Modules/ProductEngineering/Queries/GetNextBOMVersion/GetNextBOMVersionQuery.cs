using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.ProductEngineering.Queries.GetNextBOMVersion;

// خروجی int است (عدد بعدی)
public record GetNextBOMVersionQuery(int ProductId) : IRequest<int>;

public class GetNextBOMVersionQueryHandler : IRequestHandler<GetNextBOMVersionQuery, int>
{
    private readonly IApplicationDbContext _context;

    public GetNextBOMVersionQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(GetNextBOMVersionQuery request, CancellationToken cancellationToken)
    {
        // دریافت آخرین ورژن ثبت شده (حتی اگر حذف شده باشد)
        var maxVersion = await _context.Set<BOMHeader>()
            .IgnoreQueryFilters() // دیدن همه رکوردها (حذف شده و نشده)
            .Where(x => x.ProductId == request.ProductId)
            .MaxAsync(x => (int?)x.Version, cancellationToken); // کست به Nullable برای هندل کردن لیست خالی

        // اگر رکوردی نبود (null)، ورژن می‌شود 1
        // اگر بود، می‌شود max + 1
        return (maxVersion ?? 0) + 1;
    }
}