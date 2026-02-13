namespace ERPDotNet.Application.Modules.Inventory.DTOs;

public record WarehouseDto
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Code { get; init; } = string.Empty;
    public string? Address { get; init; }
    public string Type { get; init; } = string.Empty; // عنوان فارسی Enum
    public bool IsActive { get; init; }
    public string? CreatedBy { get; init; }
    public DateTime CreatedAt { get; init; }
    public byte[]? RowVersion { get; init; }
}