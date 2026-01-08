using ERPDotNet.Domain.Modules.Inventory.Models;

namespace ERPDotNet.Domain.Modules.Inventory.Services;

public interface IInventoryPostingService
{
    // ثبت سند (کاهش/افزایش بر اساس نوع سند)
    Task<InventoryPostingResult> ProcessDocumentAsync(InventoryPostingContext context, CancellationToken cancellationToken);

    // ابطال/برگشت سند (تولید تراکنش عکس)
    Task<InventoryPostingResult> ReverseDocumentAsync(InventoryPostingContext originalContext, CancellationToken cancellationToken);
}