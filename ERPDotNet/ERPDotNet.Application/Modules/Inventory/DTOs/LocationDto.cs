namespace ERPDotNet.Application.Modules.Inventory.DTOs;

public class LocationDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public int? ParentId { get; set; }
    public string Path { get; set; } = string.Empty;
    public bool IsBlocked { get; set; }
    
    // سطح در درخت (0 = ریشه، 1 = فرزند اول و ...)
    public int Level { get; set; } 
    
    public string RowVersion { get; set; } = string.Empty;
}