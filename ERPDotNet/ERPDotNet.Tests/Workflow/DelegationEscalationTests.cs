using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
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

// سررسید (SLA)، تفویض اختیار و ارجاع پس از سررسید
public class DelegationEscalationTests : IDisposable
{
    private const string FinanceRole = "role-fin", ManagerRole = "role-mgr";
    private const string Accountant = "u-acc", Clerk = "u-clerk", Manager = "u-mgr";

    private readonly string _dbName = Guid.NewGuid().ToString();
    private readonly AppDbContext _db;
    private int _submitId, _approveId;

    public DelegationEscalationTests()
    {
        _db = NewContext();
        Seed();
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Task_of_a_state_with_sla_gets_a_due_date()
    {
        var instanceId = await StartAndSubmitAsync();

        using var verify = NewContext();
        var task = await verify.BpmsTasks.SingleAsync(t => t.InstanceId == instanceId && !t.IsCompleted);
        Assert.NotNull(task.DueDate);
        Assert.InRange(task.DueDate!.Value, DateTime.UtcNow.AddHours(3.9), DateTime.UtcNow.AddHours(4.1));
    }

    [Fact]
    public async Task Delegate_acts_with_delegator_roles_and_history_records_on_behalf_of()
    {
        var instanceId = await StartAndSubmitAsync();
        await Assert.ThrowsAsync<BusinessRuleException>(() => ApproveAsync(instanceId, Clerk));

        Delegate(Accountant, Clerk, DateTime.UtcNow.AddHours(-1), DateTime.UtcNow.AddDays(1));
        await ApproveAsync(instanceId, Clerk);

        using var verify = NewContext();
        var last = await verify.BpmsHistories.Where(h => h.InstanceId == instanceId).OrderBy(h => h.Id).LastAsync();
        Assert.Equal(Clerk, last.PerformedByUserId);
        Assert.Equal(Accountant, last.OnBehalfOfUserId);
    }

    [Theory]
    [InlineData(false, -48, -24)] // بازه گذشته
    [InlineData(false, 24, 48)]   // بازه آینده
    [InlineData(true, -1, 24)]    // لغو شده
    public async Task Inactive_delegation_grants_nothing(bool revoked, int fromHours, int toHours)
    {
        var instanceId = await StartAndSubmitAsync();
        Delegate(Accountant, Clerk, DateTime.UtcNow.AddHours(fromHours), DateTime.UtcNow.AddHours(toHours), revoked);

        await Assert.ThrowsAsync<BusinessRuleException>(() => ApproveAsync(instanceId, Clerk));
    }

    [Fact]
    public async Task Escalation_role_can_act_only_after_the_due_date()
    {
        var instanceId = await StartAndSubmitAsync();
        await Assert.ThrowsAsync<BusinessRuleException>(() => ApproveAsync(instanceId, Manager));

        var task = await _db.BpmsTasks.SingleAsync(t => t.InstanceId == instanceId && !t.IsCompleted);
        task.DueDate = DateTime.UtcNow.AddMinutes(-5);
        await _db.SaveChangesAsync();

        await ApproveAsync(instanceId, Manager);

        using var verify = NewContext();
        Assert.Equal(BpmsInstanceStatus.Completed, (await verify.BpmsInstances.SingleAsync(i => i.Id == instanceId)).Status);
        var last = await verify.BpmsHistories.Where(h => h.InstanceId == instanceId).OrderBy(h => h.Id).LastAsync();
        Assert.Null(last.OnBehalfOfUserId);
    }

    [Fact]
    public async Task Inbox_and_details_show_overdue_task_to_escalation_role_and_delegated_task_to_delegate()
    {
        var instanceId = await StartAndSubmitAsync();
        Assert.Empty((await Inbox(Manager)).Items);
        Assert.Empty((await Inbox(Clerk)).Items);

        Delegate(Accountant, Clerk, DateTime.UtcNow.AddHours(-1), DateTime.UtcNow.AddDays(1));
        var clerkItem = Assert.Single((await Inbox(Clerk)).Items);
        Assert.False(clerkItem.IsOverdue);
        Assert.NotNull(clerkItem.DueDate);

        var task = await _db.BpmsTasks.SingleAsync(t => t.InstanceId == instanceId && !t.IsCompleted);
        task.DueDate = DateTime.UtcNow.AddMinutes(-5);
        await _db.SaveChangesAsync();

        var managerItem = Assert.Single((await Inbox(Manager)).Items);
        Assert.True(managerItem.IsOverdue);
        var details = await new GetTaskDetailsQueryHandler(NewContext(), new User(Manager))
            .Handle(new GetTaskDetailsQuery(managerItem.TaskId), default);
        Assert.True(details.ViaEscalation);
        Assert.Equal("تایید مالی", Assert.Single(details.AvailableTransitions).ActionTitle);
    }

    [Fact]
    public async Task Admin_privilege_is_not_delegated()
    {
        _db.Roles.Add(new IdentityRole { Id = "role-admin", Name = BpmsTransitionAccess.AdminRoleName });
        _db.UserRoles.Add(new IdentityUserRole<string> { UserId = "u-admin", RoleId = "role-admin" });
        _db.SaveChanges();
        var instanceId = await StartAndSubmitAsync();
        Delegate("u-admin", Clerk, DateTime.UtcNow.AddHours(-1), DateTime.UtcNow.AddDays(1));

        await Assert.ThrowsAsync<BusinessRuleException>(() => ApproveAsync(instanceId, Clerk));
    }

    private async Task<long> StartAndSubmitAsync()
    {
        var instanceId = await Engine().StartProcessAsync(new StartProcessRequest
        {
            CompanyId = 1,
            ProcessCode = "P",
            TargetRecordId = 7,
            UserId = Clerk,
            InitialVariables = new()
        }, default);
        await Engine().ExecuteTransitionAsync(
            new ExecuteTransitionRequest { InstanceId = instanceId, TransitionId = _submitId, UserId = Clerk }, default);
        return instanceId;
    }

    private Task ApproveAsync(long instanceId, string userId) =>
        Engine().ExecuteTransitionAsync(
            new ExecuteTransitionRequest { InstanceId = instanceId, TransitionId = _approveId, UserId = userId }, default);

    private void Delegate(string from, string to, DateTime start, DateTime end, bool revoked = false)
    {
        _db.BpmsDelegations.Add(new BpmsDelegation
        {
            CompanyId = 1, FromUserId = from, ToUserId = to, StartDate = start, EndDate = end, IsRevoked = revoked
        });
        _db.SaveChanges();
    }

    private BpmsEngineService Engine() =>
        new(NewContext(), new BpmsRuleEvaluator(), new NoActions(), NullLogger<BpmsEngineService>.Instance);

    private AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(_dbName)
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);

    private void Seed()
    {
        _db.Roles.AddRange(
            new IdentityRole { Id = FinanceRole, Name = "مالی" },
            new IdentityRole { Id = ManagerRole, Name = "مدیر" });
        _db.UserRoles.AddRange(
            new IdentityUserRole<string> { UserId = Accountant, RoleId = FinanceRole },
            new IdentityUserRole<string> { UserId = Manager, RoleId = ManagerRole });

        var process = new BpmsProcess { CompanyId = 1, ProcessCode = "P", Title = "فرآیند", TargetEntityName = "Doc" };
        var version = new BpmsProcessVersion { Process = process, VersionNumber = 1, IsActive = true };
        var start = new BpmsState { ProcessVersion = version, Title = "شروع", StateCode = "S", Type = BpmsStateType.Start };
        var review = new BpmsState
        {
            ProcessVersion = version, Title = "بررسی مالی", StateCode = "R", Type = BpmsStateType.Intermediate,
            SlaHours = 4, EscalationRoleId = ManagerRole
        };
        var end = new BpmsState { ProcessVersion = version, Title = "پایان", StateCode = "E", Type = BpmsStateType.End };
        _db.AddRange(process, version, start, review, end);
        _db.SaveChanges();

        var submit = new BpmsTransition { ProcessVersionId = version.Id, FromStateId = start.Id, ToStateId = review.Id, ActionTitle = "ارسال" };
        var approve = new BpmsTransition
        {
            ProcessVersionId = version.Id, FromStateId = review.Id, ToStateId = end.Id, ActionTitle = "تایید مالی",
            AllowedRoles = { new BpmsTransitionRole { RoleId = FinanceRole } }
        };
        _db.AddRange(submit, approve);
        _db.SaveChanges();
        (_submitId, _approveId) = (submit.Id, approve.Id);
    }

    private Task<ERPDotNet.Application.Common.Models.PaginatedResult<ERPDotNet.Application.Modules.Workflow.DTOs.InboxTaskDto>> Inbox(string userId) =>
        new GetInboxTasksHandler(NewContext(), new User(userId)).Handle(new GetInboxTasksQuery(), default);

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
