using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.StockCounts;

/// <summary>ثبت مقدار شمارش‌شده؛ سطر بدون شناسه، کالایی است که در سیستم نبود ولی در انبار پیدا شد</summary>
public record UpdateStockCountCommand : IRequest
{
    public int Id { get; set; }
    public string? Description { get; set; }
    public List<StockCountLineInput> Lines { get; set; } = new();
}

public record StockCountLineInput
{
    public long? Id { get; set; }
    public int ProductId { get; set; }
    public int? LocationId { get; set; }
    public int? BatchId { get; set; }
    public decimal? CountedQuantity { get; set; }
}

public class UpdateStockCountValidator : AbstractValidator<UpdateStockCountCommand>
{
    public UpdateStockCountValidator()
    {
        RuleFor(x => x.Description).MaximumLength(500);
        RuleForEach(x => x.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.ProductId).GreaterThan(0);
            line.RuleFor(l => l.CountedQuantity).GreaterThanOrEqualTo(0)
                .WithMessage("مقدار شمارش‌شده نمی‌تواند منفی باشد.");
        });
        RuleFor(x => x).Custom((cmd, validation) =>
            StockCountRules.FindDuplicates(cmd.Lines.Select(l => new StockCountRules.StockKey(l.ProductId, l.LocationId, l.BatchId)))
                .ForEach(validation.AddFailure));
    }
}

public class UpdateStockCountHandler : IRequestHandler<UpdateStockCountCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateStockCountHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(UpdateStockCountCommand request, CancellationToken cancellationToken)
    {
        var count = await _context.StockCounts
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException("انبارگردانی یافت نشد.");

        if (count.Status != StockCountStatus.Counting)
            throw new BusinessRuleException("انبارگردانی نهایی شده و تغییر نمی‌کند.");

        var newLocationIds = request.Lines.Where(l => l.Id == null && l.LocationId.HasValue).Select(l => l.LocationId!.Value).Distinct().ToList();
        if (newLocationIds.Count > 0)
        {
            var valid = await _context.Locations.CountAsync(l => newLocationIds.Contains(l.Id) && l.WarehouseId == count.WarehouseId, cancellationToken);
            if (valid != newLocationIds.Count)
                throw new BusinessRuleException("قفسه سطر جدید باید متعلق به انبار همین انبارگردانی باشد.");
        }

        count.Description = request.Description;
        var keep = request.Lines.Where(l => l.Id.HasValue).Select(l => l.Id!.Value).ToHashSet();

        // سطر سیستمی حذف نمی‌شود (شمارش صفر یعنی موجود نبود)؛ فقط سطرهای افزوده‌شده قابل حذف‌اند
        var removed = count.Lines.Where(l => !keep.Contains(l.Id) && l.SystemQuantity == 0).ToList();
        foreach (var line in removed)
        {
            count.Lines.Remove(line);
            _context.StockCountLines.Remove(line);
        }

        foreach (var input in request.Lines)
        {
            if (input.Id.HasValue)
            {
                var line = count.Lines.FirstOrDefault(l => l.Id == input.Id)
                    ?? throw new BusinessRuleException("سطر انبارگردانی یافت نشد.");
                line.CountedQuantity = input.CountedQuantity;
            }
            else
            {
                count.Lines.Add(new StockCountLine
                {
                    ProductId = input.ProductId,
                    LocationId = input.LocationId,
                    BatchId = input.BatchId,
                    SystemQuantity = 0,
                    CountedQuantity = input.CountedQuantity
                });
            }
        }

        // سطر جدید نباید همان کالا/قفسه/بچِ یک سطر موجود باشد
        var duplicates = StockCountRules.FindDuplicates(
            count.Lines.Select(l => new StockCountRules.StockKey(l.ProductId, l.LocationId, l.BatchId)));
        if (duplicates.Count > 0)
            throw new BusinessRuleException(duplicates[0]);

        await _context.SaveChangesAsync(cancellationToken);
    }
}
