using ERPDotNet.Domain.Common;
using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;


// جدول کمکی برای نگهداری انواع رفرنس مجاز (جایگزین رشته)
public class InventoryDocTypeAllowedRef : BaseEntity
{
    public int Id { get; set; }
    public int InventoryDocTypeId { get; set; }
    
    // نام موجودیت (مثلاً "PurchaseOrder") - این باید با نام ثابت سیستم یکی باشد
    [MaxLength(100)] public required string ReferenceEntityName { get; set; } 
}