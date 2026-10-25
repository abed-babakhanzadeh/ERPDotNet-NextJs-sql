using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.BaseInfo.Entities;

// گروه کالا به‌صورت درختی (مثلاً مواد اولیه > فلزات > ورق)
public class ProductCategory : BaseEntity
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public required string Title { get; set; }
    public int? ParentId { get; set; }
    public ProductCategory? Parent { get; set; }
    public ICollection<ProductCategory> Children { get; set; } = new List<ProductCategory>();
    public bool IsActive { get; set; } = true;
}
