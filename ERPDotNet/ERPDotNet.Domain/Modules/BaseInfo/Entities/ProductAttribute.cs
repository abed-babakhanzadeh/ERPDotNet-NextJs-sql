using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.BaseInfo.Entities;

// ویژگی کالا برای ساخت تنوع (مثلاً رنگ: قرمز، آبی)
public class ProductAttribute : BaseEntity
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public required string Title { get; set; }
    public ICollection<ProductAttributeValue> Values { get; set; } = new List<ProductAttributeValue>();
    public bool IsActive { get; set; } = true;
}

public class ProductAttributeValue
{
    public int Id { get; set; }
    public int AttributeId { get; set; }
    public ProductAttribute? Attribute { get; set; }
    // در کد کالای تنوع استفاده می‌شود
    public required string Code { get; set; }
    public required string Title { get; set; }
    public int SortOrder { get; set; }
}

// مقدار ویژگی هر کالای تنوع
public class ProductVariantValue
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public int AttributeValueId { get; set; }
    public ProductAttributeValue? AttributeValue { get; set; }
}
