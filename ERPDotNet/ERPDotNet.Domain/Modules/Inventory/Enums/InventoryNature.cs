using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Domain.Modules.Inventory.Enums;

public enum InventoryNature
{
    [Display(Name = "وارده (رسید)")]
    Input = 1,

    [Display(Name = "صادره (حواله)")]
    Output = 2,

    [Display(Name = "انتقال / جابجایی")]
    Transfer = 3
}