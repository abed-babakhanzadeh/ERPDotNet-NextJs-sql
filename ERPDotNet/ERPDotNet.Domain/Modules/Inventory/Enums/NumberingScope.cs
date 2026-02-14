using System.ComponentModel.DataAnnotations;

namespace ERPDotNet.Domain.Modules.Inventory.Enums;


public enum NumberingScope
{
    [Display(Name = "سراسری (سریال کلی)")]
    Global = 1,

    [Display(Name = "به تفکیک سال مالی")]
    PerFiscalYear = 2,

    [Display(Name = "به تفکیک نوع سند")]
    PerDocType = 3,

    [Display(Name = "به تفکیک نوع سند و سال مالی")]
    PerDocTypeAndYear = 4
}