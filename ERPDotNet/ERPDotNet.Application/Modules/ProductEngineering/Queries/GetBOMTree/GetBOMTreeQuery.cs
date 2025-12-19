using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.ProductEngineering.Queries.GetBOMTree;

public record GetBOMTreeQuery(int BomId) : IRequest<BOMTreeNodeDto?>;

public class GetBOMTreeHandler : IRequestHandler<GetBOMTreeQuery, BOMTreeNodeDto?>
{
    private readonly IApplicationDbContext _context;

    public GetBOMTreeHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<BOMTreeNodeDto?> Handle(GetBOMTreeQuery request, CancellationToken cancellationToken)
    {
        // 1. دریافت BOM ریشه
        var rootBom = await _context.BOMHeaders
            .AsNoTracking()
            .Include(x => x.Product).ThenInclude(p => p.Unit)
            .Include(x => x.Details).ThenInclude(d => d.ChildProduct).ThenInclude(cp => cp.Unit)
            .FirstOrDefaultAsync(x => x.Id == request.BomId, cancellationToken);

        if (rootBom == null) return null;

        // 2. شروع ساخت درخت به صورت بازگشتی
        return await BuildNodeAsync(rootBom, 1, "ROOT", cancellationToken);
    }

    // متد بازگشتی (قلب تپنده ماژول)
    private async Task<BOMTreeNodeDto> BuildNodeAsync(
        BOMHeader bom, 
        decimal parentQuantityMultiplier, 
        string parentKey,
        CancellationToken token)
    {
        var children = new List<BOMTreeNodeDto>();

        foreach (var detail in bom.Details)
        {
            // محاسبه مقدار کل: (مقدار این مرحله * ضریب مرحله قبل)
            var totalQty = detail.Quantity * parentQuantityMultiplier;
            var currentKey = $"{parentKey}-{detail.ChildProductId}";

            // 3. جستجو: آیا این ماده اولیه، خودش BOM فعال دارد؟
            // نکته: ما همیشه آخرین ورژنِ "Active" را برای زیرمجموعه‌ها برمی‌داریم
            var childBom = await _context.BOMHeaders
                .AsNoTracking()
                .Include(x => x.Product).ThenInclude(p => p.Unit)
                .Include(x => x.Details).ThenInclude(d => d.ChildProduct).ThenInclude(cp => cp.Unit)
                .Where(x => x.ProductId == detail.ChildProductId && x.Status == BOMStatus.Active)
                .OrderByDescending(x => x.Version) // آخرین ورژن
                .FirstOrDefaultAsync(token);

            if (childBom != null)
            {
                // اگر BOM داشت، ریکرسیو صدا می‌زنیم (انفجار!)
                var childNode = await BuildNodeAsync(childBom, totalQty, currentKey, token);
                
                // اما مقادیر نود را با مقادیر "مصرف" در این مرحله آپدیت می‌کنیم
                // (چون BuildNodeAsync مشخصات خود BOM را برمی‌گرداند، ما باید مشخصات مصرف را ست کنیم)
                children.Add(childNode with 
                { 
                    Key = currentKey,
                    Quantity = detail.Quantity,
                    TotalQuantity = totalQty,
                    WastePercentage = detail.WastePercentage,
                    Type = "نیمه ساخته"
                });
            }
            else
            {
                // اگر BOM نداشت، یعنی "ماده اولیه" است (برگ درخت)
                children.Add(new BOMTreeNodeDto(
                    currentKey,
                    null, // BomId ندارد
                    detail.ChildProductId,
                    detail.ChildProduct!.Name,
                    detail.ChildProduct.Code,
                    detail.ChildProduct.Unit!.Title,
                    detail.Quantity,
                    totalQty,
                    detail.WastePercentage,
                    "ماده اولیه",
                    false,
                    new List<BOMTreeNodeDto>()
                ));
            }
        }

        // بازگشت نود اصلی
        return new BOMTreeNodeDto(
            parentKey,
            bom.Id,
            bom.ProductId,
            bom.Product!.Name,
            bom.Product.Code,
            bom.Product.Unit!.Title,
            1, // مقدار پایه همیشه ۱ است
            parentQuantityMultiplier, // مقدار کل
            0,
            "محصول نهایی / نیمه ساخته",
            true,
            children
        );
    }
}