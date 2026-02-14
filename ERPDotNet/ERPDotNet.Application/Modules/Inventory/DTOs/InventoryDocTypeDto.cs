using ERPDotNet.Domain.Modules.Inventory.Enums;

namespace ERPDotNet.Application.Modules.Inventory.DTOs;

public class InventoryDocTypeDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Nature { get; set; } = string.Empty; // متن فارسی Enum
    public InventoryNature NatureValue { get; set; } // مقدار عددی برای ادیت
    
    public int? ParentId { get; set; }
    public string? ParentTitle { get; set; }
    
    public string? RequiredPermissionName { get; set; }
    public bool AffectsCost { get; set; }
    public NumberingScope NumberingScope { get; set; }
    public bool IsReferenceRequired { get; set; }
    
    // لیست نام رفرنس‌های مجاز
    public List<string> AllowedReferenceEntityNames { get; set; } = new();
    
    public string RowVersion { get; set; } = string.Empty;
}