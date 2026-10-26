using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.Contracts;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Services;

/// <summary>
/// ارزش‌گذاری حرکت‌های یک سند هنگام قطعی شدن یا ابطال (میانگین موزون متحرک یا FIFO، طبق تنظیمات).
/// باید روی همان DbContext و پیش از SaveChanges صدا زده شود تا ارزش، مقدار و تراز در یک تراکنش ثبت شوند.
/// </summary>
public interface IInventoryValuationService
{
    Task ApplyAsync(InventoryDocHeader doc, InventoryDocType docType, IReadOnlyList<InventoryTransaction> transactions, bool isReversal, CancellationToken cancellationToken);
}

/// <summary>
/// قواعد:
/// - رسید: بهای واحد سطر؛ اگر خالی است، از ارائه‌دهنده مرجع (مثلاً تولید)؛ وگرنه برای نوع سند «ریالی» بدون مرجع خطا،
///   و در بقیه (اضافی انبارگردانی، برگشت مواد، نوع سند غیرریالی) با میانگین فعلی، پس میانگین تغییر نمی‌کند
/// - حواله: با میانگین فعلی؛ اگر موجودی صفر شود کل ارزش باقی‌مانده خارج می‌شود تا گرد کردن ارزش یتیم نگذارد
/// - انتقال: خروج با میانگین مبدأ و ورود با همان بها؛ در سطح «شرکت» تراز تغییری نمی‌کند
/// - ابطال: دقیقاً با بهای تراکنش اصلی برمی‌گردد
/// در FIFO بهای حواله از لایه‌ها می‌آید (فایل InventoryValuationService.Fifo) و بقیه قواعد همین‌هاست.
/// </summary>
public partial class InventoryValuationService : IInventoryValuationService
{
    private readonly IApplicationDbContext _context;
    private readonly IEnumerable<IReceiptCostProvider> _providers;

    public InventoryValuationService(IApplicationDbContext context, IEnumerable<IReceiptCostProvider> providers)
    {
        _context = context;
        _providers = providers;
    }

    private sealed record BalanceKey(int? CompanyId, int ProductId, int? WarehouseId);

    public async Task ApplyAsync(InventoryDocHeader doc, InventoryDocType docType, IReadOnlyList<InventoryTransaction> transactions, bool isReversal, CancellationToken cancellationToken)
    {
        if (transactions.Count == 0) return;

        var settings = await InventoryValuationSettingsReader.GetAsync(_context, cancellationToken);
        if (settings.Method is not (ValuationMethod.MovingAverage or ValuationMethod.Fifo))
            throw new BusinessRuleException($"روش ارزش‌گذاری «{settings.Method.ToDisplay()}» هنوز پیاده نشده است؛ در تنظیمات، روش دیگری انتخاب کنید.");
        var fifo = settings.Method == ValuationMethod.Fifo ? new FifoCostLayers(_context) : null;
        var byWarehouse = settings.Level == ValuationLevel.Warehouse;

        var warehouseIds = transactions.Select(t => t.WarehouseId).Distinct().ToList();
        var companies = await _context.Warehouses.AsNoTracking().IgnoreQueryFilters()
            .Where(w => warehouseIds.Contains(w.Id))
            .ToDictionaryAsync(w => w.Id, w => w.CompanyId, cancellationToken);
        BalanceKey KeyOf(InventoryTransaction t) =>
            new(companies.GetValueOrDefault(t.WarehouseId), t.ProductId, byWarehouse ? t.WarehouseId : null);

        var receiptCosts = isReversal || docType.Nature != InventoryNature.Input
            ? new Dictionary<long, decimal>()
            : await ResolveReceiptCostsAsync(doc, docType, settings.ProductionCostBasis, cancellationToken);
        var originalCosts = isReversal ? await LoadOriginalCostsAsync(transactions, cancellationToken) : new Dictionary<long, decimal>();

        var balances = new Dictionary<BalanceKey, InventoryCostBalance>();
        var transferCosts = new Dictionary<long, decimal>();
        var transferSlices = new Dictionary<long, List<FifoCostLayers.Slice>>();
        var transferTotals = new Dictionary<long, decimal>();
        // انتقالی که هر دو سرش در یک دامنه است (مثلاً دو انبار یک شرکت در سطح «شرکت») تراز و لایه را تغییر نمی‌دهد
        var sameScopeTransfers = docType.Nature == InventoryNature.Transfer
            ? transactions.GroupBy(t => t.DocDetailId).Where(g => g.Select(KeyOf).Distinct().Count() == 1).Select(g => g.Key).ToHashSet()
            : [];

        foreach (var t in transactions)
        {
            var key = KeyOf(t);
            if (!balances.TryGetValue(key, out var balance))
                balances[key] = balance = await LoadBalanceAsync(key, companies, cancellationToken);

            decimal total;
            if (fifo == null || sameScopeTransfers.Contains(t.DocDetailId))
            {
                decimal unit;
                if (isReversal)
                    unit = t.RelatedTransactionId is { } original ? originalCosts.GetValueOrDefault(original) : 0;
                else if (t.Sign == InventoryTransactionSign.Decrease)
                    unit = balance.AverageCost;
                else if (docType.Nature == InventoryNature.Transfer)
                    unit = transferCosts.GetValueOrDefault(t.DocDetailId);
                else
                    unit = receiptCosts.TryGetValue(t.DocDetailId, out var cost) ? cost : balance.AverageCost;

                total = Math.Round(t.Quantity * unit, 4, MidpointRounding.AwayFromZero);
                // در FIFO خروج انتقال درون دامنه بهای قدیمی‌ترین لایه‌ها را می‌گیرد، بی‌آنکه مصرفشان کند
                if (fifo != null && !isReversal && t.Sign == InventoryTransactionSign.Decrease)
                    total = FifoCostLayers.Peek(await fifo.ScopeAsync(key, balance, cancellationToken), t.Quantity, balance.AverageCost);
            }
            else
            {
                total = await ApplyFifoAsync(fifo, t, key, balance, docType, isReversal, receiptCosts, originalCosts, transferSlices, cancellationToken);
                // ورود انتقال همان ارزشی را می‌برد که از مبدأ خارج شد
                if (!isReversal && docType.Nature == InventoryNature.Transfer && t.Sign == InventoryTransactionSign.Increase)
                    total = transferTotals.GetValueOrDefault(t.DocDetailId, total);
            }

            // خروج آخرین موجودی کل ارزش باقی‌مانده را می‌برد
            if (t.Sign == InventoryTransactionSign.Decrease && balance.Quantity - t.Quantity == 0)
                total = balance.Value;

            balance.Quantity += t.Quantity * (int)t.Sign;
            balance.Value += total * (int)t.Sign;

            t.TotalCost = total;
            t.UnitCost = t.Quantity > 0 ? Math.Round(total / t.Quantity, 6, MidpointRounding.AwayFromZero) : 0;
            if (!isReversal && docType.Nature == InventoryNature.Transfer && t.Sign == InventoryTransactionSign.Decrease)
            {
                transferCosts[t.DocDetailId] = t.UnitCost.Value;
                transferTotals[t.DocDetailId] = total;
            }
        }
    }

    private static async Task<decimal> ApplyFifoAsync(
        FifoCostLayers fifo, InventoryTransaction t, BalanceKey key, InventoryCostBalance balance, InventoryDocType docType, bool isReversal,
        Dictionary<long, decimal> receiptCosts, Dictionary<long, decimal> originalCosts, Dictionary<long, List<FifoCostLayers.Slice>> transferSlices,
        CancellationToken ct)
    {
        var layers = await fifo.ScopeAsync(key, balance, ct);
        var originalUnit = t.RelatedTransactionId is { } related ? originalCosts.GetValueOrDefault(related) : 0;

        if (t.Sign == InventoryTransactionSign.Decrease)
        {
            // ابطال رسید (یا ورود انتقال) اول لایه‌ای را برمی‌دارد که خودش ساخته بود
            var preferred = isReversal ? FifoCostLayers.CreatedBy(layers, t.RelatedTransactionId) : [];
            var taken = new List<FifoCostLayers.Slice>();
            var total = fifo.Consume(layers, t, preferred, balance.AverageCost, taken);
            if (!isReversal && docType.Nature == InventoryNature.Transfer) transferSlices[t.DocDetailId] = taken;
            return total;
        }

        if (isReversal)
        {
            // ابطال حواله (یا خروج انتقال): همان لایه‌های مصرف‌شده برمی‌گردند
            var restored = t.RelatedTransactionId is { } original ? await fifo.RestoreAsync(layers, t, original, ct) : [];
            if (restored.Count > 0) return restored.Sum(r => r.Cost);
            fifo.Receive(layers, key, t, t.Quantity, originalUnit);
            return Math.Round(t.Quantity * originalUnit, 4, MidpointRounding.AwayFromZero);
        }

        if (docType.Nature == InventoryNature.Transfer)
        {
            // ورود انتقال بین دو دامنه: هر لایه مصرف‌شده مبدأ با همان بها در مقصد
            var slices = transferSlices.GetValueOrDefault(t.DocDetailId) ?? [];
            foreach (var slice in slices) fifo.Receive(layers, key, t, slice.Quantity, slice.Layer.UnitCost);
            return slices.Sum(s => s.Cost);
        }

        var unit = receiptCosts.TryGetValue(t.DocDetailId, out var cost) ? cost : balance.AverageCost;
        fifo.Receive(layers, key, t, t.Quantity, unit);
        return Math.Round(t.Quantity * unit, 4, MidpointRounding.AwayFromZero);
    }

    private async Task<Dictionary<long, decimal>> ResolveReceiptCostsAsync(InventoryDocHeader doc, InventoryDocType docType, ProductionCostBasis costBasis, CancellationToken ct)
    {
        var costs = doc.Details.Where(d => d.UnitCost.HasValue).ToDictionary(d => d.Id, d => d.UnitCost!.Value);

        var missing = doc.Details.Where(d => !d.UnitCost.HasValue).ToList();
        if (missing.Count > 0 && doc.ReferenceEntityName is { } reference && doc.ReferenceEntityId is { } referenceId)
        {
            var provider = _providers.FirstOrDefault(p => p.ReferenceEntityName == reference);
            if (provider != null)
            {
                var provided = await provider.GetUnitCostsAsync(new ReceiptCostRequest(doc.Id, referenceId, costBasis,
                    missing.Select(d => new ReceiptCostLine(d.Id, d.ProductId, d.MainUnitQuantity, d.ReferenceEntityName)).ToList()), ct);
                foreach (var (detailId, cost) in provided) costs[detailId] = cost;
            }
        }

        // رسید «ریالی» بدون مرجع (مثل رسید خرید) بدون بهای واحد ثبت نمی‌شود
        if (docType.AffectsCost && doc.ReferenceEntityName == null)
        {
            var rows = doc.Details.OrderBy(d => d.Id).Select((d, i) => (d, Row: i + 1)).Where(x => !costs.ContainsKey(x.d.Id)).ToList();
            if (rows.Count > 0)
            {
                var ids = rows.Select(r => r.d.ProductId).Distinct().ToList();
                var codes = await _context.Products.AsNoTracking().Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Code, ct);
                throw new BusinessRuleException(string.Join("\n", rows.Select(r =>
                    $"سطر {r.Row} ({codes.GetValueOrDefault(r.d.ProductId, r.d.ProductId.ToString())}): بهای واحد را وارد کنید؛ این نوع سند ریالی است.")));
            }
        }
        return costs;
    }

    private async Task<Dictionary<long, decimal>> LoadOriginalCostsAsync(IReadOnlyList<InventoryTransaction> transactions, CancellationToken ct)
    {
        var ids = transactions.Where(t => t.RelatedTransactionId.HasValue).Select(t => t.RelatedTransactionId!.Value).Distinct().ToList();
        return await _context.InventoryTransactions.AsNoTracking()
            .Where(t => ids.Contains(t.Id))
            .ToDictionaryAsync(t => t.Id, t => t.UnitCost ?? 0, ct);
    }

    /// <summary>
    /// تراز موجود، یا تراز تازه از جمع تراکنش‌های قبلی همان دامنه (موجودی پیش از فعال شدن ارزش‌گذاری با ارزش صفر)
    /// </summary>
    private async Task<InventoryCostBalance> LoadBalanceAsync(BalanceKey key, Dictionary<int, int?> knownCompanies, CancellationToken ct)
    {
        var existing = await _context.InventoryCostBalances.FirstOrDefaultAsync(b =>
            b.CompanyId == key.CompanyId && b.ProductId == key.ProductId && b.WarehouseId == key.WarehouseId, ct);
        if (existing != null) return existing;

        var history = _context.InventoryTransactions.AsNoTracking().Where(t => t.ProductId == key.ProductId);
        if (key.WarehouseId is { } warehouseId)
        {
            history = history.Where(t => t.WarehouseId == warehouseId);
        }
        else
        {
            var scope = await _context.Warehouses.AsNoTracking().IgnoreQueryFilters()
                .Where(w => w.CompanyId == key.CompanyId).Select(w => w.Id).ToListAsync(ct);
            // انبارهای حرکت جاری که هنوز در دیتابیس ذخیره نشده‌اند هم در دامنه‌اند
            scope.AddRange(knownCompanies.Where(c => c.Value == key.CompanyId).Select(c => c.Key));
            history = history.Where(t => scope.Contains(t.WarehouseId));
        }
        var totals = await history
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Quantity = g.Sum(t => t.Quantity * (t.Sign == InventoryTransactionSign.Increase ? 1 : -1)),
                Value = g.Sum(t => (t.TotalCost ?? 0) * (t.Sign == InventoryTransactionSign.Increase ? 1 : -1))
            })
            .FirstOrDefaultAsync(ct);

        var balance = new InventoryCostBalance
        {
            CompanyId = key.CompanyId,
            ProductId = key.ProductId,
            WarehouseId = key.WarehouseId,
            Quantity = totals?.Quantity ?? 0,
            Value = totals?.Value ?? 0
        };
        _context.InventoryCostBalances.Add(balance);
        return balance;
    }
}

/// <summary>خواندن تنظیمات سراسری؛ نبودن ردیف یعنی پیش‌فرض‌ها</summary>
public static class InventoryValuationSettingsReader
{
    public static async Task<InventoryValuationSettings> GetAsync(IApplicationDbContext context, CancellationToken ct) =>
        await context.InventoryValuationSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == InventoryValuationSettings.SingletonId, ct)
        ?? new InventoryValuationSettings();
}
