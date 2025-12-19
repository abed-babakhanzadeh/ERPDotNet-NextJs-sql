namespace ERPDotNet.Application.Modules.ProductEngineering.Queries.GetWhereUsed;

public record WhereUsedDto(
    int Id,
    int BomId,
    string BomTitle,
    string BomVersion,
    string BomStatus,
    
    int ParentProductId,
    string ParentProductName,
    string ParentProductCode,
    
    string UsageType, // "ماده اولیه" یا "جایگزین"
    decimal Quantity, // مقدار مصرف (برای جایگزین ضریب است)
    string UnitName   // واحد سنجش
);