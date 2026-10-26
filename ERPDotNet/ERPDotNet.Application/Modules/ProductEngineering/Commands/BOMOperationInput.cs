using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.ProductEngineering.Commands;

/// <summary>عملیات مسیر تولید در فرم‌های ثبت و ویرایش BOM</summary>
public record BOMOperationInputDto
{
    public int Sequence { get; set; }
    public required string Title { get; set; }
    public required int WorkCenterId { get; set; }
    public decimal SetupMinutes { get; set; }
    // به ازای مقدار پایه فرمول
    public decimal RunMinutes { get; set; }
    public string? Description { get; set; }
}

public class BOMOperationInputValidator : AbstractValidator<BOMOperationInputDto>
{
    public BOMOperationInputValidator()
    {
        RuleFor(x => x.Sequence).GreaterThan(0).WithMessage("ترتیب عملیات باید بیشتر از صفر باشد.");
        RuleFor(x => x.Title).NotEmpty().WithMessage("عنوان عملیات را وارد کنید.")
            .MaximumLength(100).WithMessage("عنوان عملیات حداکثر ۱۰۰ کاراکتر است.");
        RuleFor(x => x.WorkCenterId).GreaterThan(0).WithMessage("مرکز کاری عملیات انتخاب نشده است.");
        RuleFor(x => x.SetupMinutes).GreaterThanOrEqualTo(0).WithMessage("زمان آماده‌سازی نمی‌تواند منفی باشد.");
        RuleFor(x => x.RunMinutes).GreaterThanOrEqualTo(0).WithMessage("زمان اجرا نمی‌تواند منفی باشد.");
        RuleFor(x => x).Must(x => x.SetupMinutes + x.RunMinutes > 0)
            .WithMessage(x => $"عملیات {x.Sequence}: زمان آماده‌سازی یا اجرا باید بیشتر از صفر باشد.");
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

/// <summary>قواعد مشترک مسیر تولید در ثبت، ویرایش و کپی BOM</summary>
public static class BOMOperationRules
{
    public const string DuplicateMessage = "ترتیب عملیات در مسیر تولید تکراری است.";
    public const string WorkCenterMessage = "مرکز کاری انتخاب‌شده وجود ندارد یا غیرفعال است.";

    public static bool AreDistinct(IReadOnlyCollection<BOMOperationInputDto> operations) =>
        operations.Select(o => o.Sequence).Distinct().Count() == operations.Count;

    public static async Task<bool> WorkCentersAreActiveAsync(
        IApplicationDbContext context, IReadOnlyCollection<BOMOperationInputDto> operations, CancellationToken ct)
    {
        var ids = operations.Select(o => o.WorkCenterId).Distinct().ToList();
        if (ids.Count == 0) return true;
        return await context.WorkCenters.CountAsync(w => ids.Contains(w.Id) && w.IsActive, ct) == ids.Count;
    }

    /// <summary>عملیات با «ترتیب» شناخته می‌شود؛ ردیف موجود به‌روز می‌شود تا ایندکس یکتا نشکند</summary>
    public static void Sync(BOMHeader bom, IEnumerable<BOMOperationInputDto> operations)
    {
        var requested = operations.ToList();
        foreach (var removed in bom.Operations.Where(o => requested.All(r => r.Sequence != o.Sequence)).ToList())
            bom.Operations.Remove(removed);

        foreach (var input in requested)
        {
            var existing = bom.Operations.FirstOrDefault(o => o.Sequence == input.Sequence);
            if (existing == null)
            {
                existing = new BOMOperation { BOMHeaderId = bom.Id, Sequence = input.Sequence, Title = input.Title, WorkCenterId = input.WorkCenterId };
                bom.Operations.Add(existing);
            }
            existing.Title = input.Title.Trim();
            existing.WorkCenterId = input.WorkCenterId;
            existing.SetupMinutes = input.SetupMinutes;
            existing.RunMinutes = input.RunMinutes;
            existing.Description = string.IsNullOrWhiteSpace(input.Description) ? null : input.Description.Trim();
        }
    }
}
