using System.ComponentModel.DataAnnotations;
using ERPDotNet.Domain.Common;

namespace ERPDotNet.Domain.Modules.BaseInfo.Entities;

// سال مالی یک شرکت؛ بازه‌های سال‌های یک شرکت هم‌پوشانی ندارند
public class FiscalYear : BaseEntity
{
    public int Id { get; set; }
    public required int CompanyId { get; set; }
    public Company? Company { get; set; }
    public required string Title { get; set; } // مثال: ۱۴۰۵
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public FiscalYearStatus Status { get; set; } = FiscalYearStatus.Open;

    public bool Contains(DateTime date) => date.Date >= StartDate.Date && date.Date <= EndDate.Date;
}

public enum FiscalYearStatus
{
    [Display(Name = "باز")]
    Open = 1,
    [Display(Name = "بسته شده")]
    Closed = 2
}
