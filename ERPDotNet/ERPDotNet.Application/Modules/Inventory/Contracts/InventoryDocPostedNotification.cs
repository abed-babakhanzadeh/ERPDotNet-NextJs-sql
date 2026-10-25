using ERPDotNet.Domain.Modules.Inventory.Entities;
using MediatR;

namespace ERPDotNet.Application.Modules.Inventory.Contracts;

/// <summary>
/// رویداد بین‌ماژولی قطعی شدن سند انبار. فقط داده ساده دارد تا شنونده‌ها (تولید، حسابداری)
/// به موجودیت‌های داخلی انبار وابسته نشوند.
/// </summary>
public sealed record InventoryDocPostedNotification(
    long DocId,
    long DocNumber,
    int DocTypeId,
    DateTime DocDate,
    int? FiscalYearId,
    int WarehouseId,
    int? DestinationWarehouseId,
    string? ReferenceEntityName,
    long? ReferenceEntityId,
    IReadOnlyList<InventoryDocPostedLine> Lines) : INotification
{
    public static InventoryDocPostedNotification From(InventoryDocHeader doc) => new(
        doc.Id,
        doc.DocNumber,
        doc.DocTypeId,
        doc.DocDate,
        doc.FiscalYearId,
        doc.WarehouseId,
        doc.DestinationWarehouseId,
        doc.ReferenceEntityName,
        doc.ReferenceEntityId,
        doc.Details
            .Where(d => !d.IsDeleted)
            .Select(d => new InventoryDocPostedLine(d.Id, d.ProductId, d.MainUnitQuantity, d.BatchId, d.ReferenceEntityName, d.ReferenceEntityLineId))
            .ToList());
}

public sealed record InventoryDocPostedLine(
    long DetailId,
    int ProductId,
    decimal Quantity,
    int? BatchId,
    string? ReferenceEntityName,
    long? ReferenceEntityLineId);
