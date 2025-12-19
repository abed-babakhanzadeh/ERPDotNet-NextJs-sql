using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.BaseInfo.Entities;

public class Unit : BaseEntity
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public required string Symbol { get; set; }
    public int Precision { get; set; }
    public bool IsActive { get; set; } = true;

    // === بخش جدید: واحد فرعی ===
    // اگر این فیلد پر باشد، یعنی این واحد، فرعی است
    public int? BaseUnitId { get; set; } 
    public Unit? BaseUnit { get; set; } // نویگیشن
    
    // ضریب تبدیل (مثلا: هر 1 کارتن = 24 عدد)
    // اگر واحد اصلی باشد، ضریب 1 است
    public decimal ConversionFactor { get; set; } = 1;
}