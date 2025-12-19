namespace ERPDotNet.Application.Modules.ProductEngineering.Queries.GetBOM;

public record BOMDto(
    int Id,
    int ProductId,
    string ProductName,
    string ProductCode,
    string? ProductDescription, // <--- اضافه شد
    string UnitName, 
    
    string Title,
    string Version,
    int StatusId,
    string StatusTitle,
    int TypeId,
    string TypeTitle,
    
    string FromDate,
    string? ToDate,
    bool IsActive,
    
    byte[] RowVersion, // <--- حیاتی برای کنترل همروندی
    
    List<BOMDetailDto> Details
);

public record BOMDetailDto(
    int Id,
    int ChildProductId,
    string ChildProductName,
    string ChildProductCode,
    string? ChildProductDescription, // <--- اضافه شد
    string UnitName, 
    
    decimal Quantity,
    decimal InputQuantity, 
    int InputUnitId,       
    string InputUnitName,  
    decimal WastePercentage,
    
    List<BOMSubstituteDto> Substitutes
);

public record BOMSubstituteDto(
    int Id,
    int SubstituteProductId,
    string SubstituteProductName,
    string SubstituteProductCode,
    int Priority,
    decimal Factor,
    bool IsMixAllowed,
    decimal MaxMixPercentage,
    string? Note
);