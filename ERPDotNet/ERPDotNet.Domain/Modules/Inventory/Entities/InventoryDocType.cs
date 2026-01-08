using ERPDotNet.Domain.Common;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;

public class InventoryDocType : BaseEntity
{
    public int Id { get; set; }
    [MaxLength(100)] public required string Title { get; set; }
    public InventoryNature Nature { get; set; } // ورود / خروج / انتقال

    // ساختار درختی انواع سند
    public int? ParentId { get; set; }
    public InventoryDocType? Parent { get; set; }
    public ICollection<InventoryDocType> Children { get; set; } = new List<InventoryDocType>();

    // === قوانین (Business Rules) ===
    
    // 1. کنترل مبنا
    public bool IsReferenceRequired { get; set; } = false;
    
    // 2. کنترل دسترسی (نام پرمیشن مورد نیاز)
    [MaxLength(100)] public string? RequiredPermissionName { get; set; }
    
    // 3. آیا ریالی می‌شود؟ (برای آینده)
    public bool AffectsCost { get; set; } = true;

    // 4. اسکوپ شماره‌گذاری (برای DocNumber)
    // مثلا هر سال ریست شود؟ یا هر نوع سند سریال جدا داشته باشد؟
    public NumberingScope NumberingScope { get; set; } = NumberingScope.Global;

    // لیست رفرنس‌های مجاز (PurchaseOrder, etc.)
    public ICollection<InventoryDocTypeAllowedRef> AllowedReferences { get; set; } = new List<InventoryDocTypeAllowedRef>();
}
