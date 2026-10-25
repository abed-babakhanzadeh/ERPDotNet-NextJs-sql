using System.ComponentModel.DataAnnotations;
using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.BaseInfo.Entities;

// مرکز هزینه درختی؛ تولید، حسابداری و منابع انسانی هزینه‌ها را به آن نسبت می‌دهند
public class CostCenter : BaseEntity
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public required string Title { get; set; }
    public CostCenterType Type { get; set; } = CostCenterType.Production;
    public int? ParentId { get; set; }
    public CostCenter? Parent { get; set; }
    public ICollection<CostCenter> Children { get; set; } = new List<CostCenter>();
    public bool IsActive { get; set; } = true;
}

public enum CostCenterType
{
    [Display(Name = "تولیدی")]
    Production = 1,
    [Display(Name = "خدماتی (پشتیبانی تولید)")]
    Service = 2,
    [Display(Name = "اداری")]
    Administrative = 3,
    [Display(Name = "فروش و توزیع")]
    Sales = 4
}
