using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.Commands.SubmitInventoryDoc;
using ERPDotNet.Application.Modules.Inventory.Queries.GetInventoryDocById;
using ERPDotNet.Application.Modules.Inventory.Services;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Infrastructure.Persistence;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Tests.Inventory;

// دسترسی سطح داده به انبار
public class WarehouseAccessTests : IDisposable
{
    private const int Main = 1, Branch = 2;
    private const string Keeper = "u-keeper", Free = "u-free", Boss = "u-boss";

    private readonly AppDbContext _db = new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private long _transferId;

    public WarehouseAccessTests()
    {
        _db.Roles.Add(new IdentityRole { Id = "r-admin", Name = "Admin" });
        _db.UserRoles.Add(new IdentityUserRole<string> { UserId = Boss, RoleId = "r-admin" });
        _db.WarehouseUserAccesses.AddRange(
            new WarehouseUserAccess { UserId = Keeper, WarehouseId = Branch },
            new WarehouseUserAccess { UserId = Boss, WarehouseId = Branch });
        var transfer = new InventoryDocHeader { DocTypeId = 1, WarehouseId = Main, DestinationWarehouseId = Branch };
        _db.InventoryDocHeaders.Add(transfer);
        _db.SaveChanges();
        _transferId = transfer.Id;
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Admin_is_unrestricted()
    {
        Assert.Null(await Service(Boss).GetAllowedWarehouseIdsAsync(default));
    }

    [Fact]
    public async Task User_without_assignment_has_no_warehouse_access()
    {
        var service = Service(Free);
        Assert.Empty((await service.GetAllowedWarehouseIdsAsync(default))!);

        var error = await Assert.ThrowsAsync<ForbiddenAccessException>(() => service.EnsureAccessAsync(Main, default));
        Assert.Equal(WarehouseAccessService.NoWarehouseMessage, error.Message);
    }

    [Fact]
    public async Task Assigned_user_sees_only_assigned_warehouses()
    {
        var service = Service(Keeper);
        Assert.Equal([Branch], await service.GetAllowedWarehouseIdsAsync(default));
        await service.EnsureAccessAsync(Branch, default);
        await Assert.ThrowsAsync<ForbiddenAccessException>(() => service.EnsureAccessAsync(Main, default));
    }

    [Fact]
    public async Task Destination_keeper_can_view_a_transfer_but_not_act_on_it()
    {
        var behavior = new WarehouseAccessBehavior<GetInventoryDocByIdQuery, bool>(Service(Keeper), _db);
        Assert.True(await behavior.Handle(new GetInventoryDocByIdQuery(_transferId), _ => Task.FromResult(true), default));

        var submit = new WarehouseAccessBehavior<SubmitInventoryDocCommand, bool>(Service(Keeper), _db);
        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            submit.Handle(new SubmitInventoryDocCommand(_transferId), _ => Task.FromResult(true), default));
    }

    private WarehouseAccessService Service(string userId) => new(_db, new User(userId));

    private sealed class User(string userId) : ICurrentUserService
    {
        public string? UserId => userId;
        public string? CompanyId => "1";
    }
}
