using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Services;

public partial class InventoryValuationService
{
    /// <summary>
    /// لایه‌های بهای FIFO در طول ارزش‌گذاری یک سند. تراز ریالی همچنان نگهداری می‌شود و جمع لایه‌های باز با مقدار تراز برابر است.
    /// - رسید: لایه تازه با بهای رسید
    /// - حواله: از قدیمی‌ترین لایه مصرف می‌کند و هر مصرف ثبت می‌شود
    /// - انتقال بین دو دامنه: لایه‌های مصرف‌شده مبدأ با همان بها در مقصد ساخته می‌شوند؛ انتقال درون یک دامنه به لایه‌ها دست نمی‌زند
    /// - ابطال حواله: همان لایه‌های مصرف‌شده برمی‌گردند؛ ابطال رسید: اول از لایه خودش، بعد FIFO
    /// </summary>
    private sealed class FifoCostLayers
    {
        public sealed record Slice(InventoryCostLayer Layer, decimal Quantity, decimal Cost);

        private readonly IApplicationDbContext _context;
        private readonly Dictionary<BalanceKey, List<InventoryCostLayer>> _scopes = new();

        public FifoCostLayers(IApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// لایه‌های باز دامنه به ترتیب ساخت. اگر مقدار تراز از جمع لایه‌ها بیشتر باشد (موجودی پیش از FIFO)، برای مابه‌التفاوت
        /// یک لایه «اول دوره» با ارزش باقی‌مانده تراز ساخته می‌شود. باید پیش از اعمال حرکت روی تراز صدا زده شود.
        /// </summary>
        public async Task<List<InventoryCostLayer>> ScopeAsync(BalanceKey key, InventoryCostBalance balance, CancellationToken ct)
        {
            if (_scopes.TryGetValue(key, out var cached)) return cached;

            var layers = await _context.InventoryCostLayers
                .Where(l => l.ProductId == key.ProductId && l.CompanyId == key.CompanyId && l.WarehouseId == key.WarehouseId && l.RemainingQuantity > 0)
                .OrderBy(l => l.Id)
                .ToListAsync(ct);

            var missing = balance.Quantity - layers.Sum(l => l.RemainingQuantity);
            if (missing > 0)
            {
                var value = Math.Max(0, balance.Value - layers.Sum(l => l.RemainingQuantity * l.UnitCost));
                var opening = NewLayer(key, null, missing, Math.Round(value / missing, 6, MidpointRounding.AwayFromZero));
                layers.Insert(0, opening);
            }

            _scopes[key] = layers;
            return layers;
        }

        /// <summary>بهای قدیمی‌ترین «quantity» واحد بدون مصرف (انتقال درون یک دامنه)</summary>
        public static decimal Peek(List<InventoryCostLayer> layers, decimal quantity, decimal fallbackUnit)
        {
            decimal cost = 0;
            foreach (var layer in layers.Where(l => l.RemainingQuantity > 0))
            {
                if (quantity <= 0) break;
                var take = Math.Min(quantity, layer.RemainingQuantity);
                cost += take * layer.UnitCost;
                quantity -= take;
            }
            return Round(cost + quantity * fallbackUnit);
        }

        /// <summary>
        /// مصرف از لایه‌ها؛ لایه‌های ترجیحی (مثلاً لایه خود رسید در ابطال) اول. بهای کل را برمی‌گرداند و برش‌های مصرف را در taken می‌گذارد.
        /// </summary>
        public decimal Consume(List<InventoryCostLayer> layers, InventoryTransaction transaction, IEnumerable<InventoryCostLayer> preferred, decimal fallbackUnit, List<Slice> taken)
        {
            var quantity = transaction.Quantity;
            decimal total = 0;
            foreach (var layer in preferred.Concat(layers).Distinct().Where(l => l.RemainingQuantity > 0).ToList())
            {
                if (quantity <= 0) break;
                var take = Math.Min(quantity, layer.RemainingQuantity);
                var cost = Round(take * layer.UnitCost);
                layer.RemainingQuantity -= take;
                quantity -= take;
                total += cost;
                taken.Add(new Slice(layer, take, cost));
                _context.InventoryCostLayerConsumptions.Add(new InventoryCostLayerConsumption { Layer = layer, Transaction = transaction, Quantity = take, Cost = cost });
            }
            // جمع لایه‌ها با مقدار تراز برابر است، پس باقی‌مانده فقط با داده ناسازگار پیش می‌آید
            return total + Round(quantity * fallbackUnit);
        }

        public void Receive(List<InventoryCostLayer> layers, BalanceKey key, InventoryTransaction transaction, decimal quantity, decimal unitCost) =>
            layers.Add(NewLayer(key, transaction, quantity, unitCost));

        /// <summary>
        /// برگرداندن مصرف‌های یک حرکت کاهشی به همان لایه‌ها (ابطال حواله یا خروج انتقال)؛ اگر مصرفی ثبت نشده باشد خالی برمی‌گردد
        /// </summary>
        public async Task<List<Slice>> RestoreAsync(List<InventoryCostLayer> layers, InventoryTransaction transaction, long originalTransactionId, CancellationToken ct)
        {
            var consumptions = await _context.InventoryCostLayerConsumptions
                .Include(c => c.Layer)
                .Where(c => c.TransactionId == originalTransactionId)
                .ToListAsync(ct);

            var slices = new List<Slice>();
            foreach (var group in consumptions.GroupBy(c => c.Layer!))
            {
                var quantity = group.Sum(c => c.Quantity);
                var cost = group.Sum(c => c.Cost);
                if (quantity <= 0) continue;
                group.Key.RemainingQuantity += quantity;
                _context.InventoryCostLayerConsumptions.Add(new InventoryCostLayerConsumption { Layer = group.Key, Transaction = transaction, Quantity = -quantity, Cost = -cost });
                if (!layers.Contains(group.Key)) layers.Add(group.Key);
                slices.Add(new Slice(group.Key, quantity, cost));
            }
            // لایه برگشتی جای خودش را در صف FIFO پیدا می‌کند؛ لایه‌های تازه (بدون شناسه) آخر می‌مانند
            layers.Sort((a, b) => (a.Id == 0, a.Id).CompareTo((b.Id == 0, b.Id)));
            return slices;
        }

        /// <summary>لایه‌هایی که یک حرکت افزایشی ساخته (لایه خود رسید در ابطال آن)</summary>
        public static IEnumerable<InventoryCostLayer> CreatedBy(List<InventoryCostLayer> layers, long? transactionId) =>
            transactionId is { } id ? layers.Where(l => l.SourceTransactionId == id) : [];

        private InventoryCostLayer NewLayer(BalanceKey key, InventoryTransaction? source, decimal quantity, decimal unitCost)
        {
            var layer = new InventoryCostLayer
            {
                CompanyId = key.CompanyId,
                ProductId = key.ProductId,
                WarehouseId = key.WarehouseId,
                SourceTransaction = source,
                UnitCost = unitCost,
                OriginalQuantity = quantity,
                RemainingQuantity = quantity
            };
            _context.InventoryCostLayers.Add(layer);
            return layer;
        }

        private static decimal Round(decimal value) => Math.Round(value, 4, MidpointRounding.AwayFromZero);
    }
}
