using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Domain.Modules.Inventory.Entities;


public enum WarehouseType
{
    [Display(Name = "فیزیکی")] Physical = 1,
    [Display(Name = "ضایعات")] Scrap = 2,
    [Display(Name = "قرنطینه")] Quarantine = 3,
    [Display(Name = "پای خط")] ShopFloor = 4,
    [Display(Name = "امانی ما نزد دیگران")] ConsignmentOut = 5
}
