namespace ERPDotNet.Application.Modules.ProductEngineering.Queries.GetBOMTree;

public record BOMTreeNodeDto(
    string Key,              // کلید یکتا برای کامپوننت درخت (مثلا: "10-12")
    
    int? BomId,              // شناسه فرمول (اگر نال باشد یعنی ماده خام است و فرمول ندارد)
    int ProductId,
    string ProductName,
    string ProductCode,
    string UnitName,
    
    decimal Quantity,        // مقدار مصرف در این مرحله
    decimal TotalQuantity,   // مقدار مصرف کل (ضریب در مراحل بالاتر)
    decimal WastePercentage,
    
    string Type,             // "محصول"، "نیمه ساخته"، "ماده اولیه"
    bool IsRecursive,        // آیا خودش زیرمجموعه دارد؟
    
    List<BOMTreeNodeDto> Children // <--- جادوی بازگشتی
);