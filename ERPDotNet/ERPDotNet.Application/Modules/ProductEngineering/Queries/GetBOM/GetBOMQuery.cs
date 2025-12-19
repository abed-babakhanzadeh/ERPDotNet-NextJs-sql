using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Extensions; 
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace ERPDotNet.Application.Modules.ProductEngineering.Queries.GetBOM;

public record GetBOMQuery(int Id) : IRequest<BOMDto?>;

public class GetBOMHandler : IRequestHandler<GetBOMQuery, BOMDto?>
{
    private readonly IApplicationDbContext _context;

    public GetBOMHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<BOMDto?> Handle(GetBOMQuery request, CancellationToken cancellationToken)
    {
        var bom = await _context.BOMHeaders
            .AsNoTracking()
            .Include(x => x.Product)
                // اصلاح ۱: استفاده از ! برای p
                .ThenInclude(p => p!.Unit) 
            .Include(x => x.Details)
                .ThenInclude(d => d.ChildProduct)
                    // اصلاح ۲: استفاده از ! برای cp
                    .ThenInclude(cp => cp!.Unit) 
            .Include(x => x.Details)
                .ThenInclude(d => d.Substitutes)
                    .ThenInclude(s => s.SubstituteProduct)
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (bom == null) return null;

        // در مپینگ هم از ! استفاده می‌کنیم چون با توجه به لاجیک دیتابیس (Foreign Keys)
        // مطمئن هستیم که کالا و واحد آن وجود دارند.
        return new BOMDto(
            bom.Id,
            bom.ProductId,
            bom.Product!.Name,
            bom.Product.Code,
            bom.Product.Descriptions,
            bom.Product.Unit!.Title,

            bom.Title,
            bom.Version,
            (int)bom.Status,
            bom.Status.ToDisplay(),
            (int)bom.Type,
            bom.Type.ToDisplay(),

            bom.FromDate.ToShortDateString(),
            bom.ToDate?.ToShortDateString(),
            bom.IsActive,
            
            bom.RowVersion ?? new byte[0],

            bom.Details.Select(d => new BOMDetailDto(
                d.Id,
                d.ChildProductId,
                d.ChildProduct!.Name,
                d.ChildProduct.Code,
                d.ChildProduct.Descriptions,
                d.ChildProduct.Unit!.Title,
                
                d.Quantity,
                d.InputQuantity,
                d.InputUnitId,
                // در اینجا چک می‌کنیم اگر واحد ورودی همان واحد کالا بود، نامش را بگذاریم
                // در غیر این صورت چون Join نزدیم، فعلا متن ثابت یا نال می‌گذاریم
                // (البته اگر نیاز باشد می‌توان Unit ورودی را هم Include کرد)
                d.InputUnitId == d.ChildProduct.UnitId ? d.ChildProduct.Unit.Title : "واحد فرعی",
                d.WastePercentage,

                d.Substitutes.Select(s => new BOMSubstituteDto(
                    s.Id,
                    s.SubstituteProductId,
                    s.SubstituteProduct!.Name,
                    s.SubstituteProduct.Code,
                    s.Priority,
                    s.Factor,
                    s.IsMixAllowed,
                    s.MaxMixPercentage,
                    s.Note
                )).OrderBy(s => s.Priority).ToList()
            )).ToList()
        );
    }
}