using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ERPDotNet.Domain.Modules.Inventory.Entities;

namespace ERPDotNet.Application.Modules.Inventory.Commands.SetWarehouseUsers;

// فهرست کامل کاربران مجاز یک انبار را جایگزین می‌کند
// کاربری که هیچ انباری ندارد بدون محدودیت است؛ با اولین تخصیص فقط انبارهای خودش را می‌بیند
public record SetWarehouseUsersCommand : IRequest
{
    public int WarehouseId { get; set; }
    public List<string> UserIds { get; set; } = new();
}

public class SetWarehouseUsersValidator : AbstractValidator<SetWarehouseUsersCommand>
{
    public SetWarehouseUsersValidator()
    {
        RuleFor(x => x.WarehouseId).GreaterThan(0);
        RuleFor(x => x.UserIds).NotNull();
    }
}

public class SetWarehouseUsersHandler : IRequestHandler<SetWarehouseUsersCommand>
{
    private readonly IApplicationDbContext _context;

    public SetWarehouseUsersHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(SetWarehouseUsersCommand request, CancellationToken cancellationToken)
    {
        if (!await _context.Warehouses.AnyAsync(w => w.Id == request.WarehouseId, cancellationToken))
            throw new KeyNotFoundException("انبار یافت نشد.");

        var userIds = request.UserIds.Distinct().ToList();
        var known = await _context.Users.CountAsync(u => userIds.Contains(u.Id), cancellationToken);
        if (known != userIds.Count)
            throw new BusinessRuleException("برخی از کاربران انتخاب‌شده یافت نشدند.");

        var current = await _context.WarehouseUserAccesses
            .Where(a => a.WarehouseId == request.WarehouseId)
            .ToListAsync(cancellationToken);

        _context.WarehouseUserAccesses.RemoveRange(current.Where(a => !userIds.Contains(a.UserId)));
        foreach (var userId in userIds.Except(current.Select(a => a.UserId)))
            _context.WarehouseUserAccesses.Add(new WarehouseUserAccess { WarehouseId = request.WarehouseId, UserId = userId });

        await _context.SaveChangesAsync(cancellationToken);
    }
}
