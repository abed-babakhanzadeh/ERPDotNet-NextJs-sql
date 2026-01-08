using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.DefineWarehouse;

[CacheInvalidation("Warehouses", "WarehousesLookup")] // کش لیست انبارها باید پاک شود
public record DefineWarehouseCommand : IRequest<int>
{
    public required string Title { get; set; }
    public required string Code { get; set; }
    public WarehouseType Type { get; set; } = WarehouseType.Physical;
    public string? Address { get; set; }
    public bool IsActive { get; set; } = true;
}

public class DefineWarehouseValidator : AbstractValidator<DefineWarehouseCommand>
{
    private readonly IApplicationDbContext _context;

    public DefineWarehouseValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(x => x.Title).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50)
            .MustAsync(BeUniqueCode).WithMessage("کد انبار تکراری است.");
    }

    private async Task<bool> BeUniqueCode(string code, CancellationToken token)
    {
        return !await _context.Warehouses.AnyAsync(w => w.Code == code, token);
    }
}

public class DefineWarehouseHandler : IRequestHandler<DefineWarehouseCommand, int>
{
    private readonly IApplicationDbContext _context;

    public DefineWarehouseHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(DefineWarehouseCommand request, CancellationToken cancellationToken)
    {
        var warehouse = new Warehouse
        {
            Title = request.Title,
            Code = request.Code,
            Type = request.Type,
            Address = request.Address,
            IsActive = request.IsActive
        };

        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync(cancellationToken);

        return warehouse.Id;
    }
}