using ERPDotNet.Domain.Modules.ProductEngineering.Entities;

namespace ERPDotNet.Application.Modules.ProductEngineering.Queries.GetWhereUsed;

public record WhereUsedDto(
    int Id,                  // شناسه یکتا برای گرید
    int BomId,               // شناسه هدر فرمول
    string BomTitle,         // عنوان فرمول
    int BomVersion,          // نسخه (int)
    string BomStatus,        // وضعیت (فعال/پیش‌نویس)
    
    int BomUsageId,          // شناسه نوع مصرف (1=Main, 2=Alternate)
    string BomUsageTitle,    // عنوان نوع مصرف (اصلی/فرعی)

    int ParentProductId,     // شناسه محصول پدر
    string ParentProductName,// نام محصول پدر
    string ParentProductCode,// کد محصول پدر
    
    string UsageType,        // "ماده اولیه" یا "جایگزین"
    decimal Quantity,        // مقدار مصرف
    string UnitName,         // واحد سنجش
    int Level,               // سطح در درخت
    string Path              // مسیر سلسله‌مراتب
);