using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.Commands.CreateInventoryDoc;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.StockCounts;

public record FinalizeStockCountResult(long? SurplusDocId, long? ShortageDocId);

/// <summary>
/// نهایی کردن انبارگردانی: اضافی‌ها سند وارده و کسری‌ها سند صادره (پیش‌نویس) می‌شوند.
/// نوع سند فقط وقتی لازم است که اختلافی از همان جنس وجود داشته باشد.
/// </summary>
public record FinalizeStockCountCommand : IRequest<FinalizeStockCountResult>
{
    public int Id { get; set; }
    public int? SurplusDocTypeId { get; set; }
    public int? ShortageDocTypeId { get; set; }
}

public class FinalizeStockCountHandler : IRequestHandler<FinalizeStockCountCommand, FinalizeStockCountResult>
{
    private const string ReferenceName = "StockCount";

    private readonly IApplicationDbContext _context;
    private readonly ISender _sender;

    public FinalizeStockCountHandler(IApplicationDbContext context, ISender sender)
    {
        _context = context;
        _sender = sender;
    }

    public async Task<FinalizeStockCountResult> Handle(FinalizeStockCountCommand request, CancellationToken cancellationToken)
    {
        var count = await _context.StockCounts
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("انبارگردانی یافت نشد.");

        if (count.Status != StockCountStatus.Counting)
            throw new BusinessRuleException("این انبارگردانی قبلاً نهایی شده است.");

        var uncounted = count.Lines.Count(l => l.CountedQuantity == null);
        if (uncounted > 0)
            throw new BusinessRuleException($"{uncounted} سطر هنوز شمرده نشده است؛ مقدار شمارش (حتی صفر) را وارد کنید.");

        var adjustments = StockCountRules.ComputeAdjustments(count.Lines.Select(l =>
            (new StockCountRules.StockKey(l.ProductId, l.LocationId, l.BatchId), l.SystemQuantity, l.CountedQuantity!.Value)));

        await EnsureAdjustableAsync(adjustments, cancellationToken);

        var surplus = adjustments.Where(a => a.Quantity > 0).ToList();
        var shortage = adjustments.Where(a => a.Quantity < 0).ToList();
        await EnsureDocTypeAsync(surplus.Count > 0, request.SurplusDocTypeId, InventoryNature.Input, "اضافی", cancellationToken);
        await EnsureDocTypeAsync(shortage.Count > 0, request.ShortageDocTypeId, InventoryNature.Output, "کسری", cancellationToken);

        // ساخت اسناد و نهایی شدن با هم انجام می‌شوند یا هیچ‌کدام
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        if (surplus.Count > 0)
            count.SurplusDocId = await CreateDocAsync(count, request.SurplusDocTypeId!.Value, surplus, "اضافی", cancellationToken);
        if (shortage.Count > 0)
            count.ShortageDocId = await CreateDocAsync(count, request.ShortageDocTypeId!.Value, shortage, "کسری", cancellationToken);

        count.Status = StockCountStatus.Finalized;
        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new FinalizeStockCountResult(count.SurplusDocId, count.ShortageDocId);
    }

    private async Task EnsureAdjustableAsync(List<StockCountRules.Adjustment> adjustments, CancellationToken ct)
    {
        if (adjustments.Any(a => a.LocationId == null))
            throw new BusinessRuleException("برای سطری که اختلاف دارد قفسه مشخص نیست؛ سند اصلاحی بدون قفسه ثبت نمی‌شود.");

        var ids = adjustments.Select(a => a.ProductId).Distinct().ToList();
        var serialCodes = await _context.InventoryItemProfiles.AsNoTracking()
            .Where(p => ids.Contains(p.ProductId) && p.IsSerialManaged)
            .Join(_context.Products, p => p.ProductId, x => x.Id, (p, x) => x.Code)
            .ToListAsync(ct);
        if (serialCodes.Count > 0)
            throw new BusinessRuleException(
                $"اختلاف کالای سریال‌دار ({string.Join("، ", serialCodes)}) باید با سند دستی و شماره سریال اصلاح شود.");
    }

    private async Task EnsureDocTypeAsync(bool needed, int? docTypeId, InventoryNature nature, string label, CancellationToken ct)
    {
        if (!needed) return;
        if (docTypeId == null)
            throw new BusinessRuleException($"برای اختلاف‌های {label} نوع سند را انتخاب کنید.");
        var ok = await _context.InventoryDocTypes.AnyAsync(t => t.Id == docTypeId && t.Nature == nature, ct);
        if (!ok)
            throw new BusinessRuleException(nature == InventoryNature.Input
                ? "نوع سند اضافی باید از نوع وارده (رسید) باشد."
                : "نوع سند کسری باید از نوع صادره (حواله) باشد.");
    }

    private Task<long> CreateDocAsync(StockCount count, int docTypeId, List<StockCountRules.Adjustment> lines, string label, CancellationToken ct) =>
        _sender.Send(new CreateInventoryDocCommand
        {
            DocTypeId = docTypeId,
            WarehouseId = count.WarehouseId,
            DocDate = count.CountDate,
            ReferenceEntityName = ReferenceName,
            ReferenceEntityId = count.Id,
            Description = $"{label} انبارگردانی شماره {count.Id}",
            Details = lines.Select(a => new CreateInventoryDocDetailDto
            {
                ProductId = a.ProductId,
                MainUnitQuantity = Math.Abs(a.Quantity),
                LocationId = a.LocationId!.Value,
                BatchId = a.BatchId
            }).ToList()
        }, ct);
}
