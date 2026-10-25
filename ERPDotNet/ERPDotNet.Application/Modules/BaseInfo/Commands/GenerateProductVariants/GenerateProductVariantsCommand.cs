using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Commands.GenerateProductVariants;

/// <summary>
/// برای هر ترکیب از مقادیر انتخاب‌شده (یک مقدار از هر ویژگی) یک کالای تنوع می‌سازد.
/// ترکیب‌هایی که قبلاً ساخته شده‌اند نادیده گرفته می‌شوند.
/// </summary>
[CacheInvalidation("Products")]
public record GenerateProductVariantsCommand : IRequest<int>
{
    public int ProductId { get; set; }
    public List<int> AttributeValueIds { get; set; } = new();
}

public class GenerateProductVariantsValidator : AbstractValidator<GenerateProductVariantsCommand>
{
    public GenerateProductVariantsValidator()
    {
        RuleFor(x => x.ProductId).GreaterThan(0);
        RuleFor(x => x.AttributeValueIds).NotEmpty().WithMessage("دست‌کم یک مقدار ویژگی انتخاب کنید.");
    }
}

public class GenerateProductVariantsHandler : IRequestHandler<GenerateProductVariantsCommand, int>
{
    public const int MaxVariants = 200;
    private const int MaxCodeLength = 50, MaxNameLength = 200;

    private readonly IApplicationDbContext _context;

    public GenerateProductVariantsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(GenerateProductVariantsCommand request, CancellationToken cancellationToken)
    {
        var parent = await _context.Products
            .Include(p => p.UnitConversions)
            .FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken)
            ?? throw new KeyNotFoundException("کالا یافت نشد.");
        if (parent.VariantParentId.HasValue)
            throw new BusinessRuleException("برای کالای تنوع نمی‌توان تنوع ساخت؛ از کالای مادر استفاده کنید.");

        var ids = request.AttributeValueIds.Distinct().ToList();
        var values = await _context.ProductAttributeValues
            .Include(v => v.Attribute)
            .Where(v => ids.Contains(v.Id) && v.Attribute!.IsActive)
            .ToListAsync(cancellationToken);
        if (values.Count != ids.Count)
            throw new BusinessRuleException("برخی مقادیر ویژگی یافت نشد یا ویژگی آن غیرفعال است.");

        var groups = values
            .GroupBy(v => v.AttributeId)
            .OrderBy(g => g.First().Attribute!.Code)
            .Select(g => g.OrderBy(v => v.SortOrder).ToList())
            .ToList();

        // تنوع‌های قبلی باید همین ویژگی‌ها را داشته باشند تا ماتریس تنوع یکدست بماند
        var existing = await _context.ProductVariantValues
            .Where(x => x.Product!.VariantParentId == parent.Id)
            .Select(x => new { x.ProductId, x.AttributeValueId, x.AttributeValue!.AttributeId })
            .ToListAsync(cancellationToken);
        if (existing.Count > 0)
        {
            var existingAttributes = existing.Select(x => x.AttributeId).ToHashSet();
            if (!existingAttributes.SetEquals(groups.Select(g => g[0].AttributeId)))
                throw new BusinessRuleException("ویژگی‌های انتخاب‌شده باید همان ویژگی‌های تنوع‌های قبلی این کالا باشد.");
        }
        var existingKeys = existing
            .GroupBy(x => x.ProductId)
            .Select(g => Key(g.Select(x => x.AttributeValueId)))
            .ToHashSet();

        var combinations = groups.Aggregate(
            (IEnumerable<List<ProductAttributeValue>>)[[]],
            (acc, group) => acc.SelectMany(combo => group.Select(v => (List<ProductAttributeValue>)[.. combo, v])))
            .Where(combo => !existingKeys.Contains(Key(combo.Select(v => v.Id))))
            .ToList();
        if (combinations.Count > MaxVariants)
            throw new BusinessRuleException($"در هر بار حداکثر {MaxVariants} تنوع ساخته می‌شود؛ مقادیر کمتری انتخاب کنید.");
        if (combinations.Count == 0) return 0;

        var variants = combinations.Select(combo => new Product
        {
            Code = $"{parent.Code}-{string.Join("-", combo.Select(v => v.Code))}",
            Name = $"{parent.Name} {string.Join(" ", combo.Select(v => v.Title))}",
            LatinName = parent.LatinName,
            Descriptions = parent.Descriptions,
            UnitId = parent.UnitId,
            SupplyType = parent.SupplyType,
            CategoryId = parent.CategoryId,
            TaxCode = parent.TaxCode,
            ImagePath = parent.ImagePath,
            IsActive = true,
            VariantParentId = parent.Id,
            UnitConversions = parent.UnitConversions
                .Select(c => new ProductUnitConversion { AlternativeUnitId = c.AlternativeUnitId, Factor = c.Factor })
                .ToList(),
            VariantValues = combo.Select(v => new ProductVariantValue { AttributeValueId = v.Id }).ToList()
        }).ToList();

        var tooLong = variants.FirstOrDefault(v => v.Code.Length > MaxCodeLength || v.Name.Length > MaxNameLength);
        if (tooLong != null)
            throw new BusinessRuleException($"کد یا نام تنوع «{tooLong.Code}» از حد مجاز طولانی‌تر است.");

        // کد کالا حتی بین کالاهای حذف‌شده یکتاست
        var codes = variants.Select(v => v.Code).ToList();
        var taken = await _context.Products.IgnoreQueryFilters()
            .Where(p => codes.Contains(p.Code))
            .Select(p => p.Code)
            .FirstOrDefaultAsync(cancellationToken);
        if (taken != null)
            throw new BusinessRuleException($"کد کالای «{taken}» قبلاً ثبت شده است.");

        _context.Products.AddRange(variants);
        await _context.SaveChangesAsync(cancellationToken);
        return variants.Count;
    }

    private static string Key(IEnumerable<int> valueIds) => string.Join(",", valueIds.OrderBy(x => x));
}
