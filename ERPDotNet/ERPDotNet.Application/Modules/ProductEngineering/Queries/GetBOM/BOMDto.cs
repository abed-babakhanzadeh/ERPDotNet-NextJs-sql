using ERPDotNet.Application.Common.Extensions; // فرض بر وجود متد ToDisplay برای Enum
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;

namespace ERPDotNet.Application.Modules.ProductEngineering.Queries.GetBOM;

public record BOMDto(
    int Id,
    int ProductId,
    string ProductName,
    string ProductCode,
    string? ProductDescription,
    string UnitName, 
    
    string Title,
    int Version, // int شد
    
    int UsageId,        // اضافه شد
    string UsageTitle,  // اضافه شد
    
    int StatusId,
    string StatusTitle,
    int TypeId,
    string TypeTitle,
    
    string FromDate,
    string? ToDate,
    bool IsActive,
    
    byte[] RowVersion, 
    
    List<BOMDetailDto> Details
);

// بقیه کلاس‌ها (BOMDetailDto و ...) تغییری نمی‌کنند مگر اینکه بخواهید ورژن را در آن‌ها هم نشان دهید
public record BOMDetailDto(
    int Id,
    int ChildProductId,
    string ChildProductName,
    string ChildProductCode,
    string? ChildProductDescription,
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