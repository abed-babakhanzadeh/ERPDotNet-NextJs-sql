using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Workflow.Commands.UpdateTransitionRoles;
using ERPDotNet.Application.Modules.Workflow.Contracts;
using ERPDotNet.Application.Modules.Workflow.Interfaces;
using ERPDotNet.Application.Modules.Workflow.Queries.GetInboxTasks;
using ERPDotNet.Application.Modules.Workflow.Queries.GetTaskDetails;
using ERPDotNet.Application.Modules.Workflow.Services;
using ERPDotNet.Domain.Modules.Workflow.Entities;
using ERPDotNet.Domain.Modules.Workflow.Enums;
using ERPDotNet.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;

namespace ERPDotNet.Tests.Workflow;

public class TransitionRoleTests : IDisposable
{
    private const string Warehouse = "role-warehouse";
    private const string Finance = "role-finance";
    private const string AdminRole = "role-admin";

    private const string Keeper = "keeper";     // نقش انباردار
    private const string Accountant = "acct";   // نقش مالی
    private const string Boss = "boss";         // Admin
    private const string Nobody = "nobody";     // بدون نقش

    private readonly string _dbName = Guid.NewGuid().ToString();
    private readonly AppDbContext _db;
    private int _restrictedId, _openId, _inactiveId;
    private long _instanceId, _taskId;

    public TransitionRoleTests()
    {
        _db = NewContext();
        Seed();
    }

    public void Dispose() => _db.Dispose();

    [Theory]
    [InlineData(Keeper)]
    [InlineData(Boss)]
    public async Task User_with_allowed_role_or_admin_can_execute_restricted_transition(string userId)
    {
        await Engine().ExecuteTransitionAsync(Transition(_restrictedId, userId), default);

        using var verify = NewContext();
        Assert.Equal(BpmsInstanceStatus.Completed, (await verify.BpmsInstances.SingleAsync()).Status);
    }

    [Theory]
    [InlineData(Accountant)]
    [InlineData(Nobody)]
    public async Task User_without_allowed_role_cannot_execute_restricted_transition(string userId)
    {
        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Engine().ExecuteTransitionAsync(Transition(_restrictedId, userId), default));

        using var verify = NewContext();
        Assert.Equal(BpmsInstanceStatus.Running, (await verify.BpmsInstances.SingleAsync()).Status);
    }

    [Fact]
    public async Task Transition_without_roles_is_open_to_everyone()
    {
        await Engine().ExecuteTransitionAsync(Transition(_openId, Nobody), default);

        using var verify = NewContext();
        Assert.Equal(BpmsInstanceStatus.Completed, (await verify.BpmsInstances.SingleAsync()).Status);
    }

    [Fact]
    public async Task Inactive_transition_cannot_be_executed()
    {
        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Engine().ExecuteTransitionAsync(Transition(_inactiveId, Boss), default));
    }

    [Theory]
    [InlineData(Keeper, 2)]
    [InlineData(Boss, 2)]
    [InlineData(Accountant, 1)]
    public async Task Task_details_show_only_buttons_the_user_may_press(string userId, int expectedButtons)
    {
        var details = await new GetTaskDetailsQueryHandler(NewContext(), new User(userId))
            .Handle(new GetTaskDetailsQuery(_taskId), default);

        Assert.Equal(expectedButtons, details.AvailableTransitions.Count);
        Assert.DoesNotContain(details.AvailableTransitions, t => t.TransitionId == _inactiveId);
    }

    [Fact]
    public async Task Inbox_hides_tasks_the_user_cannot_act_on()
    {
        await SetRoles(_openId, Warehouse);

        var keeperInbox = await Inbox(Keeper);
        var acctInbox = await Inbox(Accountant);

        Assert.Single(keeperInbox.Items);
        Assert.Empty(acctInbox.Items);
    }

    [Fact]
    public async Task Update_transition_roles_replaces_the_role_set()
    {
        await SetRoles(_restrictedId, Finance);

        using var verify = NewContext();
        var roles = await verify.BpmsTransitionRoles.Where(r => r.TransitionId == _restrictedId).Select(r => r.RoleId).ToListAsync();
        Assert.Equal([Finance], roles);
    }

    [Fact]
    public async Task Clearing_roles_opens_the_transition_to_everyone()
    {
        await SetRoles(_restrictedId);

        await Engine().ExecuteTransitionAsync(Transition(_restrictedId, Nobody), default);
    }

    private Task SetRoles(int transitionId, params string[] roleIds) =>
        new UpdateTransitionRolesCommandHandler(NewContext())
            .Handle(new UpdateTransitionRolesCommand(transitionId, roleIds.ToList()), default);

    private Task<ERPDotNet.Application.Common.Models.PaginatedResult<ERPDotNet.Application.Modules.Workflow.DTOs.InboxTaskDto>> Inbox(string userId) =>
        new GetInboxTasksHandler(NewContext(), new User(userId)).Handle(new GetInboxTasksQuery(), default);

    private BpmsEngineService Engine() =>
        new(NewContext(), new BpmsRuleEvaluator(), new NoActions(), NullLogger<BpmsEngineService>.Instance);

    private ExecuteTransitionRequest Transition(int transitionId, string userId) =>
        new() { InstanceId = _instanceId, TransitionId = transitionId, UserId = userId };

    private AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(_dbName)
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);

    private void Seed()
    {
        _db.Roles.AddRange(
            new IdentityRole { Id = Warehouse, Name = "انباردار" },
            new IdentityRole { Id = Finance, Name = "مالی" },
            new IdentityRole { Id = AdminRole, Name = BpmsTransitionAccess.AdminRoleName });
        _db.UserRoles.AddRange(
            new IdentityUserRole<string> { UserId = Keeper, RoleId = Warehouse },
            new IdentityUserRole<string> { UserId = Accountant, RoleId = Finance },
            new IdentityUserRole<string> { UserId = Boss, RoleId = AdminRole });

        var process = new BpmsProcess { CompanyId = 1, ProcessCode = "P", Title = "فرآیند", TargetEntityName = "Doc" };
        var version = new BpmsProcessVersion { Process = process, VersionNumber = 1, IsActive = true };
        var review = new BpmsState { ProcessVersion = version, Title = "بررسی", StateCode = "R", Type = BpmsStateType.Start };
        var end = new BpmsState { ProcessVersion = version, Title = "پایان", StateCode = "E", Type = BpmsStateType.End };
        _db.AddRange(process, version, review, end);
        _db.SaveChanges();

        var restricted = new BpmsTransition
        {
            ProcessVersionId = version.Id, FromStateId = review.Id, ToStateId = end.Id, ActionTitle = "قطعی انبار",
            AllowedRoles = { new BpmsTransitionRole { RoleId = Warehouse } }
        };
        var open = new BpmsTransition { ProcessVersionId = version.Id, FromStateId = review.Id, ToStateId = end.Id, ActionTitle = "ارجاع" };
        var inactive = new BpmsTransition { ProcessVersionId = version.Id, FromStateId = review.Id, ToStateId = end.Id, ActionTitle = "قدیمی", IsActive = false };
        var instance = new BpmsInstance
        {
            CompanyId = 1, ProcessVersionId = version.Id, CurrentStateId = review.Id, TargetRecordId = 9, Status = BpmsInstanceStatus.Running
        };
        var task = new BpmsTask { Instance = instance, StateId = review.Id, CompanyId = 1, Title = "بررسی سند ۹" };
        _db.AddRange(restricted, open, inactive, instance, task);
        _db.SaveChanges();

        (_restrictedId, _openId, _inactiveId) = (restricted.Id, open.Id, inactive.Id);
        (_instanceId, _taskId) = (instance.Id, task.Id);
    }

    private sealed class User(string userId) : ICurrentUserService
    {
        public string? UserId => userId;
        public string? CompanyId => "1";
    }

    private sealed class NoActions : IBpmsActionResolver
    {
        public IBpmsActionHandler? Resolve(string actionCode) => null;
    }
}
