using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ERPDotNet.Application.Modules.Inventory.Services;

namespace ERPDotNet.Application.Modules.Inventory.Commands.StockCounts;

/// <summary>شروع انبارگردانی؛ سطرها از موجودی فعلی انبار (و در صورت انتخاب، فقط یک قفسه) ساخته می‌شوند</summary>
public record CreateStockCountCommand : IRequest<int>, IWarehouseScopedRequest
{
    IEnumerable<int> IWarehouseScopedRequest.ScopedWarehouseIds => [WarehouseId];
    public required int WarehouseId { get; set; }
    public int? LocationId { get; set; }
    public DateTime CountDate { get; set; } = DateTime.UtcNow;
    public string? Description { get; set; }
}

public class CreateStockCountValidator : AbstractValidator<CreateStockCountCommand>
{
    public CreateStockCountValidator(IApplicationDbContext context)
    {
        RuleFor(x => x.WarehouseId)
            .MustAsync((id, ct) => context.Warehouses.AnyAsync(w => w.Id == id, ct))
            .WithMessage("انبار انتخاب‌شده وجود ندارد.");
        RuleFor(x => x)
            .MustAsync(async (cmd, ct) => !cmd.LocationId.HasValue
                || await context.Locations.AnyAsync(l => l.Id == cmd.LocationId && l.WarehouseId == cmd.WarehouseId, ct))
            .WithMessage("قفسه انتخاب‌شده متعلق به این انبار نیست.");
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public class CreateStockCountHandler : IRequestHandler<CreateStockCountCommand, int>
{
    private readonly IApplicationDbContext _context;

    public CreateStockCountHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CreateStockCountCommand request, CancellationToken cancellationToken)
    {
        var stocks = _context.CurrentStocks.AsNoTracking()
            .Where(s => s.WarehouseId == request.WarehouseId && s.QuantityOnHand != 0);
        if (request.LocationId.HasValue)
            stocks = stocks.Where(s => s.LocationId == request.LocationId);

        var count = new StockCount
        {
            WarehouseId = request.WarehouseId,
            CountDate = request.CountDate,
            Description = request.Description,
            Lines = await stocks
                .Select(s => new StockCountLine
                {
                    ProductId = s.ProductId,
                    LocationId = s.LocationId,
                    BatchId = s.BatchId,
                    SystemQuantity = s.QuantityOnHand
                })
                .ToListAsync(cancellationToken)
        };

        _context.StockCounts.Add(count);
        await _context.SaveChangesAsync(cancellationToken);
        return count.Id;
    }
}
