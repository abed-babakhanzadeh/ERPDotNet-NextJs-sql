using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.ProductEngineering.Queries.GetWhereUsed;

[Cached(timeToLiveSeconds: 60, "WhereUsed")]
public record GetWhereUsedQuery : PaginatedRequest, IRequest<PaginatedResult<WhereUsedDto>>
{
    public int ProductId { get; set; }
    public bool MultiLevel { get; set; } = false;
    public bool EndItemsOnly { get; set; } = false;
}

public class GetWhereUsedHandler : IRequestHandler<GetWhereUsedQuery, PaginatedResult<WhereUsedDto>>
{
    private readonly IApplicationDbContext _context;

    public GetWhereUsedHandler(IApplicationDbContext context)
    {
        _context = context;
    }

   public async Task<PaginatedResult<WhereUsedDto>> Handle(GetWhereUsedQuery request, CancellationToken cancellationToken)
    {
        List<WhereUsedDto> finalDtos = new();
        int totalCount = 0;

        if (request.MultiLevel)
        {
            // === حالت چند سطحی (بازگشتی) ===
            // نکته: تابع 'get_where_used_recursive' باید در SQL Server ایجاد شده باشد (TVF)
            // در SQL Server فراخوانی به صورت SELECT * FROM Schema.Func() است
            
            var rawData = await _context.Set<WhereUsedRecursiveResult>()
                .FromSqlInterpolated($"SELECT * FROM get_where_used_recursive({request.ProductId})")
                .ToListAsync(cancellationToken);

            // ... (لاجیک فیلتر EndItemsOnly مشابه قبل) ...
            if (request.EndItemsOnly)
            {
                var allParentIds = rawData.Select(x => x.ProductId).Distinct().ToList();
                var notEndItems = await _context.BOMDetails
                    .AsNoTracking()
                    .Where(d => allParentIds.Contains(d.ChildProductId) && d.BOMHeader!.IsActive)
                    .Select(d => d.ChildProductId)
                    .Distinct()
                    .ToListAsync(cancellationToken);

                rawData = rawData.Where(r => !notEndItems.Contains(r.ProductId)).ToList();
            }

            // مپینگ دستی (Client-side Join)
            var bomIds = rawData.Select(r => r.BomHeaderId).Distinct().ToList();
            var bomDetails = await _context.BOMHeaders
                .AsNoTracking()
                .Include(b => b.Product).ThenInclude(p => p!.Unit)
                .Where(b => bomIds.Contains(b.Id))
                .ToDictionaryAsync(b => b.Id, cancellationToken);

            finalDtos = rawData.Select(r => {
                var bom = bomDetails.GetValueOrDefault(r.BomHeaderId);
                return new WhereUsedDto(
                    r.BomHeaderId,
                    r.BomHeaderId,
                    bom?.Title ?? "-",
                    bom?.Version ?? "-",
                    bom?.Status.ToDisplay() ?? "-",
                    r.ProductId,
                    bom?.Product?.Name ?? "-",
                    bom?.Product?.Code ?? "-",
                    r.Level == 1 ? r.UsageType : $"{r.UsageType} (سطح {r.Level})",
                    r.Quantity,
                    bom?.Product?.Unit?.Title ?? "-"
                );
            }).ToList();
        }
        else
        {
            // === حالت تک سطحی (بهینه شده با EF Core) ===
            // به جای فراخوانی تابع SQL، مستقیم کوئری می‌زنیم (سریع‌تر و استانداردتر)
            
            var directUsages = await _context.BOMDetails
                .AsNoTracking()
                .Include(d => d.BOMHeader).ThenInclude(h => h!.Product).ThenInclude(p => p!.Unit)
                .Where(d => d.ChildProductId == request.ProductId && d.BOMHeader!.IsActive)
                .Select(d => new WhereUsedDto(
                    d.BOMHeaderId,
                    d.BOMHeaderId,
                    d.BOMHeader!.Title,
                    d.BOMHeader.Version,
                    // برای دسترسی به Enum Display در کوئری LINQ to Entities محدودیت داریم
                    // بنابراین مقدار خام را می‌گیریم و بعدا اگر لازم شد سمت رم تبدیل می‌کنیم
                    // یا اینجا ToString می‌کنیم فعلا
                    d.BOMHeader.Status.ToString(), 
                    d.BOMHeader.ProductId,
                    d.BOMHeader.Product!.Name,
                    d.BOMHeader.Product.Code,
                    "ماده اولیه",
                    d.Quantity,
                    d.BOMHeader.Product.Unit!.Title
                ))
                .ToListAsync(cancellationToken);
                
            // چک کردن جایگزین‌ها (Substitutes)
            var substituteUsages = await _context.BOMSubstitutes
                .AsNoTracking()
                .Include(s => s.BOMDetail).ThenInclude(d => d!.BOMHeader).ThenInclude(h => h!.Product).ThenInclude(p => p!.Unit)
                .Where(s => s.SubstituteProductId == request.ProductId && s.BOMDetail!.BOMHeader!.IsActive)
                .Select(s => new WhereUsedDto(
                    s.BOMDetail!.BOMHeaderId,
                    s.BOMDetail.BOMHeaderId,
                    s.BOMDetail.BOMHeader!.Title,
                    s.BOMDetail.BOMHeader.Version,
                    s.BOMDetail.BOMHeader.Status.ToString(),
                    s.BOMDetail.BOMHeader.ProductId,
                    s.BOMDetail.BOMHeader.Product!.Name,
                    s.BOMDetail.BOMHeader.Product.Code,
                    "جایگزین",
                    s.Factor, // ضریب جایگزینی
                    s.BOMDetail.BOMHeader.Product.Unit!.Title
                ))
                .ToListAsync(cancellationToken);

            finalDtos.AddRange(directUsages);
            finalDtos.AddRange(substituteUsages);
            
            // رفع مشکل Enum Display (سمت مموری)
            // چون در دیتابیس Status عدد است و ما ToString گرفتیم (مثلا Active)، اینجا فارسی‌اش می‌کنیم
            finalDtos = finalDtos.Select(x => x with { 
                BomStatus = Enum.TryParse<Domain.Modules.ProductEngineering.Entities.BOMStatus>(x.BomStatus, out var st) 
                            ? st.ToDisplay() 
                            : x.BomStatus 
            }).ToList();
        }

        totalCount = finalDtos.Count;
        
        // صفحه‌بندی (In-Memory)
        var pagedItems = finalDtos
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToList();

        return new PaginatedResult<WhereUsedDto>(pagedItems, totalCount, request.PageNumber, request.PageSize);
    }
}