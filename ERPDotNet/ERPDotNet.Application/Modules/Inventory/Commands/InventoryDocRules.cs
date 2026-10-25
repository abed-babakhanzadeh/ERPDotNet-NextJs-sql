using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.BaseInfo.Contracts;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands;

// قوانین مشترک ساخت و ویرایش سند انبار برای ردیابی کامل:
// - لوکیشن هر سطر باید متعلق به انبار سند باشد
// - سند انتقال باید انبار مقصد متفاوت داشته باشد و هر سطر لوکیشن مقصدی از همان انبار مقصد داشته باشد
internal static class InventoryDocRules
{
    public sealed record Line(int RowNumber, int? LocationId, int? DestinationLocationId);

    public static async Task<List<string>> ValidateAsync(
        IApplicationDbContext context,
        int docTypeId,
        int warehouseId,
        int? destinationWarehouseId,
        IReadOnlyList<Line> lines,
        CancellationToken cancellationToken)
    {
        var errors = new List<string>();

        var nature = await context.InventoryDocTypes
            .AsNoTracking()
            .Where(x => x.Id == docTypeId)
            .Select(x => (InventoryNature?)x.Nature)
            .FirstOrDefaultAsync(cancellationToken);
        var isTransfer = nature == InventoryNature.Transfer;

        if (isTransfer && (destinationWarehouseId is not > 0 || destinationWarehouseId == warehouseId))
        {
            errors.Add("برای سند انتقال، انبار مقصد الزامی است و باید با انبار مبدأ متفاوت باشد.");
            return errors;
        }

        var locationIds = lines
            .SelectMany(l => new[] { l.LocationId, l.DestinationLocationId })
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();
        var locationWarehouses = await context.Locations
            .AsNoTracking()
            .Where(l => locationIds.Contains(l.Id))
            .ToDictionaryAsync(l => l.Id, l => l.WarehouseId, cancellationToken);

        foreach (var line in lines)
        {
            if (line.LocationId.HasValue && locationWarehouses.GetValueOrDefault(line.LocationId.Value) != warehouseId)
            {
                errors.Add($"سطر {line.RowNumber}: لوکیشن انتخاب‌شده متعلق به انبار سند نیست.");
            }

            if (!isTransfer) continue;

            if (!line.DestinationLocationId.HasValue)
            {
                errors.Add($"سطر {line.RowNumber}: لوکیشن مقصد را انتخاب کنید.");
            }
            else if (locationWarehouses.GetValueOrDefault(line.DestinationLocationId.Value) != destinationWarehouseId)
            {
                errors.Add($"سطر {line.RowNumber}: لوکیشن مقصد متعلق به انبار مقصد نیست.");
            }
        }

        return errors;
    }

    /// <summary>سریال‌های ورودی کاربر بدون فاصله و تکرار</summary>
    public static List<string> NormalizeSerials(IEnumerable<string>? serials) =>
        serials?.Select(s => s.Trim()).Where(s => s.Length > 0).Distinct().ToList() ?? [];

    /// <summary>خطای سریال تکراری یا بلند در یک سند (هر سریال برای هر کالا فقط یک بار)</summary>
    public static List<string> ValidateSerials(IEnumerable<(int ProductId, IEnumerable<string>? Serials)> lines)
    {
        var errors = new List<string>();
        var seen = new HashSet<(int, string)>();
        foreach (var (productId, serials) in lines)
        {
            foreach (var serial in NormalizeSerials(serials))
            {
                if (serial.Length > 100)
                    errors.Add($"شماره سریال {serial[..20]}… بیش از ۱۰۰ کاراکتر است.");
                else if (!seen.Add((productId, serial)))
                    errors.Add($"شماره سریال {serial} بیش از یک بار در این سند آمده است.");
            }
        }
        return errors;
    }

    public static async Task<bool> IsTransferAsync(IApplicationDbContext context, int docTypeId, CancellationToken cancellationToken) =>
        await context.InventoryDocTypes.AnyAsync(x => x.Id == docTypeId && x.Nature == InventoryNature.Transfer, cancellationToken);

    /// <summary>سال مالی باز سند، بر اساس شرکتِ انبار و تاریخ سند</summary>
    public static async Task<int?> ResolveFiscalYearAsync(
        IApplicationDbContext context, IFiscalYearService fiscalYears, int warehouseId, DateTime docDate, CancellationToken cancellationToken)
    {
        var companyId = await context.Warehouses
            .AsNoTracking()
            .Where(x => x.Id == warehouseId)
            .Select(x => x.CompanyId)
            .FirstOrDefaultAsync(cancellationToken);
        return await fiscalYears.ResolveOpenYearAsync(companyId, docDate, cancellationToken);
    }
}
