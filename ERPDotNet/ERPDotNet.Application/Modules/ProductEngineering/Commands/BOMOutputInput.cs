using ERPDotNet.Domain.Modules.ProductEngineering.Entities;
using FluentValidation;

namespace ERPDotNet.Application.Modules.ProductEngineering.Commands;

/// <summary>خروجی جانبی فرمول در فرم‌های ثبت و ویرایش BOM</summary>
public record BOMOutputInputDto
{
    public required int ProductId { get; set; }
    public BOMOutputType Type { get; set; } = BOMOutputType.CoProduct;
    public decimal Quantity { get; set; }
    public decimal CostSharePercent { get; set; }
}

public class BOMOutputInputValidator : AbstractValidator<BOMOutputInputDto>
{
    public BOMOutputInputValidator()
    {
        RuleFor(x => x.ProductId).GreaterThan(0).WithMessage("کالای خروجی انتخاب نشده است.");
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("مقدار خروجی جانبی باید بیشتر از صفر باشد.");
        RuleFor(x => x.CostSharePercent).InclusiveBetween(0, 100).WithMessage("سهم بهای تمام‌شده باید بین ۰ تا ۱۰۰ باشد.");
        RuleFor(x => x.CostSharePercent).Equal(0).When(x => x.Type == BOMOutputType.ByProduct)
            .WithMessage("محصول فرعی سهمی از بهای تمام‌شده ندارد.");
    }
}

/// <summary>قواعد مشترک مقدار پایه و خروجی‌های جانبی در ثبت و ویرایش BOM</summary>
public static class BOMOutputRules
{
    public const string BaseQuantityMessage = "مقدار پایه فرمول باید بیشتر از صفر باشد.";
    public const string DuplicateMessage = "یک کالا نمی‌تواند چند بار در خروجی‌های جانبی تکرار شود.";
    public const string MainProductMessage = "محصول اصلی فرمول نمی‌تواند خروجی جانبی همان فرمول باشد.";
    public const string CostShareMessage = "جمع سهم بهای محصولات همزاد باید کمتر از ۱۰۰ باشد تا سهمی برای محصول اصلی بماند.";

    public static bool AreDistinct(IReadOnlyCollection<BOMOutputInputDto> outputs) =>
        outputs.Select(o => o.ProductId).Distinct().Count() == outputs.Count;

    public static bool LeavesShareForMainProduct(IEnumerable<BOMOutputInputDto> outputs) =>
        outputs.Where(o => o.Type == BOMOutputType.CoProduct).Sum(o => o.CostSharePercent) < 100;

    public static void Sync(BOMHeader bom, IEnumerable<BOMOutputInputDto> outputs)
    {
        var requested = outputs.ToList();
        foreach (var removed in bom.Outputs.Where(o => requested.All(r => r.ProductId != o.ProductId)).ToList())
            bom.Outputs.Remove(removed);

        foreach (var input in requested)
        {
            var existing = bom.Outputs.FirstOrDefault(o => o.ProductId == input.ProductId);
            if (existing == null)
            {
                existing = new BOMOutput { BOMHeaderId = bom.Id, ProductId = input.ProductId };
                bom.Outputs.Add(existing);
            }
            existing.Type = input.Type;
            existing.Quantity = input.Quantity;
            existing.CostSharePercent = input.Type == BOMOutputType.CoProduct ? input.CostSharePercent : 0;
        }
    }
}
