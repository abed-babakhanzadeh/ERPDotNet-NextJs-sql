using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Services;

/// <summary>
/// محل و وضعیت شماره سریال‌ها را هنگام قطعی شدن یا ابطال سند انبار به‌روز می‌کند.
/// برای کالای سریال‌دار تعداد سریال‌های هر سطر باید با مقدار سطر برابر باشد و هر سریال
/// باید پیش از حرکت در همان جایی باشد که سند ادعا می‌کند.
/// </summary>
public static class InventorySerialTracker
{
    // وضعیت لازم پیش از حرکت و وضعیت پس از آن
    private sealed record Move(
        InventorySerialStatus RequiredStatus,
        int? RequiredWarehouseId,
        bool AllowNew,
        InventorySerialStatus NewStatus,
        int? NewWarehouseId,
        int? NewLocationId);

    public static async Task ApplyAsync(
        IApplicationDbContext context,
        InventoryDocHeader doc,
        InventoryNature nature,
        bool isReversal,
        CancellationToken cancellationToken)
    {
        var details = doc.Details.Where(d => !d.IsDeleted).ToList();
        var productIds = details.Select(d => d.ProductId).Distinct().ToList();

        var serialManaged = await context.InventoryItemProfiles.AsNoTracking()
            .Where(p => productIds.Contains(p.ProductId) && p.IsSerialManaged)
            .Select(p => p.ProductId)
            .ToListAsync(cancellationToken);
        var codes = await context.Products.AsNoTracking()
            .Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Code, cancellationToken);

        var errors = new List<string>();
        var rowNumber = 0;
        foreach (var detail in details)
        {
            rowNumber++;
            var count = detail.Serials.Count;
            if (!serialManaged.Contains(detail.ProductId))
            {
                if (count > 0 && !isReversal)
                    errors.Add($"ردیف {rowNumber}: کالای {codes.GetValueOrDefault(detail.ProductId)} سریال‌دار نیست؛ شماره سریال آن را پاک کنید.");
                continue;
            }

            if (!isReversal && count != detail.MainUnitQuantity)
                errors.Add($"ردیف {rowNumber}: کالای {codes.GetValueOrDefault(detail.ProductId)} سریال‌دار است؛ تعداد سریال‌ها ({count}) باید با مقدار سطر ({detail.MainUnitQuantity:0.###}) برابر باشد.");
        }
        if (errors.Count > 0) throw new BusinessRuleException(string.Join("\n", errors));

        var tracked = details.Where(d => serialManaged.Contains(d.ProductId) && d.Serials.Count > 0).ToList();
        if (tracked.Count == 0) return;

        var serialNumbers = tracked.SelectMany(d => d.Serials.Select(s => s.SerialNumber)).Distinct().ToList();
        var trackedProductIds = tracked.Select(d => d.ProductId).Distinct().ToList();
        var existing = (await context.InventorySerials
                .Where(s => trackedProductIds.Contains(s.ProductId) && serialNumbers.Contains(s.SerialNumber))
                .ToListAsync(cancellationToken))
            .ToDictionary(s => (s.ProductId, s.SerialNumber));

        foreach (var detail in tracked)
        {
            var move = MoveFor(nature, isReversal, doc, detail);
            var code = codes.GetValueOrDefault(detail.ProductId);

            foreach (var serialNumber in detail.Serials.Select(s => s.SerialNumber))
            {
                existing.TryGetValue((detail.ProductId, serialNumber), out var serial);

                if (serial == null)
                {
                    if (!move.AllowNew)
                    {
                        errors.Add($"سریال {serialNumber} کالای {code} ثبت نشده است.");
                        continue;
                    }
                    serial = new InventorySerial { ProductId = detail.ProductId, SerialNumber = serialNumber };
                    context.InventorySerials.Add(serial);
                    existing[(detail.ProductId, serialNumber)] = serial;
                }
                else if (serial.Status != move.RequiredStatus
                         || (move.RequiredWarehouseId.HasValue && serial.WarehouseId != move.RequiredWarehouseId))
                {
                    errors.Add(serial.Status == InventorySerialStatus.InStock && move.RequiredStatus == InventorySerialStatus.OutOfStock
                        ? $"سریال {serialNumber} کالای {code} همین حالا در انبار است و دوباره وارد نمی‌شود."
                        : $"سریال {serialNumber} کالای {code} در انبار این سند موجود نیست.");
                    continue;
                }

                serial.Status = move.NewStatus;
                serial.WarehouseId = move.NewWarehouseId;
                serial.LocationId = move.NewLocationId;
                serial.LastDocHeaderId = doc.Id;
            }
        }

        if (errors.Count > 0) throw new BusinessRuleException(string.Join("\n", errors));
    }

    private static Move MoveFor(InventoryNature nature, bool isReversal, InventoryDocHeader doc, InventoryDocDetail detail)
    {
        var source = doc.WarehouseId;
        var destination = doc.DestinationWarehouseId;
        return (nature, isReversal) switch
        {
            (InventoryNature.Input, false) =>
                new(InventorySerialStatus.OutOfStock, null, true, InventorySerialStatus.InStock, source, detail.LocationId),
            (InventoryNature.Input, true) =>
                new(InventorySerialStatus.InStock, source, false, InventorySerialStatus.OutOfStock, null, null),
            (InventoryNature.Transfer, false) =>
                new(InventorySerialStatus.InStock, source, false, InventorySerialStatus.InStock, destination, detail.DestinationLocationId),
            (InventoryNature.Transfer, true) =>
                new(InventorySerialStatus.InStock, destination, false, InventorySerialStatus.InStock, source, detail.LocationId),
            (_, false) =>
                new(InventorySerialStatus.InStock, source, false, InventorySerialStatus.OutOfStock, null, null),
            (_, true) =>
                new(InventorySerialStatus.OutOfStock, null, false, InventorySerialStatus.InStock, source, detail.LocationId),
        };
    }
}
