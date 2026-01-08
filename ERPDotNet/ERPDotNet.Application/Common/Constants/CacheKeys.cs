namespace ERPDotNet.Application.Common.Constants;

public static class CacheKeys
{
    // کش موجودی لحظه‌ای (Tier-0 Granularity)
    // ساختار: CurrentStock:{WarehouseId}:{ProductId}:{LocationId?}:{BatchId?}
    public static string CurrentStock(int warehouseId, int productId, int? locationId = null, string? batchNumber = null)
    {
        var key = $"CurrentStock:{warehouseId}:{productId}";
        
        if (locationId.HasValue) 
            key += $":Loc_{locationId}";
            
        if (!string.IsNullOrEmpty(batchNumber)) 
            key += $":Batch_{batchNumber}";
            
        return key;
    }

    // سایر کلیدها...
    public static string ProductCardex(int warehouseId, int productId) 
        => $"ProductCardex:{warehouseId}:{productId}";
        
    public const string WarehouseList = "WarehousesLookup";
    public const string DocTypesList = "InventoryDocTypes"; // اضافه شده برای Master Data
}