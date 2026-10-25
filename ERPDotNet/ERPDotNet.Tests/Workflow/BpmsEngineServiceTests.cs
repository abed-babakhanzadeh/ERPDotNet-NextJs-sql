using System.Text.Json;
using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Modules.Workflow.Contracts;
using ERPDotNet.Application.Modules.Workflow.Interfaces;
using ERPDotNet.Application.Modules.Workflow.Services;
using ERPDotNet.Domain.Modules.Workflow.Entities;
using ERPDotNet.Domain.Modules.Workflow.Enums;
using ERPDotNet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;

namespace ERPDotNet.Tests.Workflow;

public class BpmsEngineServiceTests : IDisposable
{
    private const int CompanyId = 1;
    private const string ProcessCode = "INV_RECEIPT";

    private readonly string _dbName = Guid.NewGuid().ToString();
    private readonly AppDbContext _db;
    private readonly FakeActionResolver _actions = new();

    private int _startStateId, _reviewStateId, _endStateId;
    private int _submitId, _approveId, _bigApproveId, _actionId;

    public BpmsEngineServiceTests()
    {
        _db = NewContext();
        SeedProcess();
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Start_creates_running_instance_at_start_state_with_open_task()
    {
        var instanceId = await StartAsync();

        using var verify = NewContext();
        var instance = await verify.BpmsInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == instanceId);
        Assert.Equal(BpmsInstanceStatus.Running, instance.Status);
        Assert.Equal(_startStateId, instance.CurrentStateId);
        var task = Assert.Single(instance.Tasks);
        Assert.False(task.IsCompleted);
        Assert.Single(await verify.BpmsHistories.Where(h => h.InstanceId == instanceId).ToListAsync());
    }

    [Fact]
    public async Task Transition_moves_state_closes_old_task_and_opens_new_one()
    {
        var instanceId = await StartAsync();

        await Engine(NewContext()).ExecuteTransitionAsync(Transition(instanceId, _submitId), default);

        using var verify = NewContext();
        var instance = await verify.BpmsInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == instanceId);
        Assert.Equal(_reviewStateId, instance.CurrentStateId);
        Assert.Single(instance.Tasks, t => t.IsCompleted && t.StateId == _startStateId);
        Assert.Single(instance.Tasks, t => !t.IsCompleted && t.StateId == _reviewStateId);
    }

    [Fact]
    public async Task Transition_to_end_completes_instance_without_new_task()
    {
        var instanceId = await StartAsync();
        await Engine(NewContext()).ExecuteTransitionAsync(Transition(instanceId, _submitId), default);

        await Engine(NewContext()).ExecuteTransitionAsync(Transition(instanceId, _approveId), default);

        using var verify = NewContext();
        var instance = await verify.BpmsInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == instanceId);
        Assert.Equal(BpmsInstanceStatus.Completed, instance.Status);
        Assert.All(instance.Tasks, t => Assert.True(t.IsCompleted));
    }

    [Fact]
    public async Task Transition_not_leaving_current_state_is_rejected()
    {
        var instanceId = await StartAsync();

        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Engine(NewContext()).ExecuteTransitionAsync(Transition(instanceId, _approveId), default));
    }

    [Fact]
    public async Task Rule_on_start_variables_blocks_transition_when_not_met()
    {
        var instanceId = await StartAsync(new() { ["Amount"] = 500 });
        await Engine(NewContext()).ExecuteTransitionAsync(Transition(instanceId, _submitId), default);

        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Engine(NewContext()).ExecuteTransitionAsync(Transition(instanceId, _bigApproveId), default));

        using var verify = NewContext();
        Assert.Equal(_reviewStateId, (await verify.BpmsInstances.SingleAsync()).CurrentStateId);
    }

    [Fact]
    public async Task Rule_on_start_variables_allows_transition_when_met()
    {
        var instanceId = await StartAsync(new() { ["Amount"] = 5000 });
        await Engine(NewContext()).ExecuteTransitionAsync(Transition(instanceId, _submitId), default);

        await Engine(NewContext()).ExecuteTransitionAsync(Transition(instanceId, _bigApproveId), default);

        using var verify = NewContext();
        Assert.Equal(BpmsInstanceStatus.Completed, (await verify.BpmsInstances.SingleAsync()).Status);
    }

    [Fact]
    public async Task Numeric_rule_on_variables_posted_from_the_inbox_form_is_evaluated()
    {
        var instanceId = await StartAsync();
        await Engine(NewContext()).ExecuteTransitionAsync(Transition(instanceId, _submitId), default);

        // Same shape the API model binder produces for { "extraVariables": { "Amount": 5000 } }
        var fromJson = JsonSerializer.Deserialize<Dictionary<string, object?>>("{\"Amount\":5000}")!;
        var request = Transition(instanceId, _bigApproveId);
        request.ExtraVariables = fromJson;

        await Engine(NewContext()).ExecuteTransitionAsync(request, default);

        using var verify = NewContext();
        Assert.Equal(BpmsInstanceStatus.Completed, (await verify.BpmsInstances.SingleAsync()).Status);
    }

    [Fact]
    public async Task Transition_runs_its_action_handler()
    {
        var instanceId = await StartAsync();
        await Engine(NewContext()).ExecuteTransitionAsync(Transition(instanceId, _submitId), default);

        await Engine(NewContext()).ExecuteTransitionAsync(Transition(instanceId, _actionId), default);

        Assert.Equal(42, Assert.Single(_actions.Handler.Calls).TargetRecordId);
    }

    [Fact]
    public async Task Transition_with_unknown_action_code_is_rejected()
    {
        _actions.Known = false;
        var instanceId = await StartAsync();
        await Engine(NewContext()).ExecuteTransitionAsync(Transition(instanceId, _submitId), default);

        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Engine(NewContext()).ExecuteTransitionAsync(Transition(instanceId, _actionId), default));
    }

    private Task<long> StartAsync(Dictionary<string, object?>? variables = null) =>
        Engine(NewContext()).StartProcessAsync(new StartProcessRequest
        {
            CompanyId = CompanyId,
            ProcessCode = ProcessCode,
            TargetRecordId = 42,
            UserId = "u1",
            InitialVariables = variables ?? new()
        }, default);

    private static ExecuteTransitionRequest Transition(long instanceId, int transitionId) =>
        new() { InstanceId = instanceId, TransitionId = transitionId, UserId = "u1" };

    private BpmsEngineService Engine(AppDbContext db) =>
        new(db, new BpmsRuleEvaluator(), _actions, NullLogger<BpmsEngineService>.Instance);

    private AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(_dbName)
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);

    private void SeedProcess()
    {
        var process = new BpmsProcess { CompanyId = CompanyId, ProcessCode = ProcessCode, Title = "رسید", TargetEntityName = "InventoryDoc" };
        var version = new BpmsProcessVersion { Process = process, VersionNumber = 1, IsActive = true };
        var start = new BpmsState { ProcessVersion = version, Title = "شروع", StateCode = "S", Type = BpmsStateType.Start };
        var review = new BpmsState { ProcessVersion = version, Title = "بررسی", StateCode = "R", Type = BpmsStateType.Intermediate };
        var end = new BpmsState { ProcessVersion = version, Title = "پایان", StateCode = "E", Type = BpmsStateType.End };
        _db.AddRange(process, version, start, review, end);
        _db.SaveChanges();

        var submit = new BpmsTransition { ProcessVersionId = version.Id, FromStateId = start.Id, ToStateId = review.Id, ActionTitle = "ارسال" };
        var approve = new BpmsTransition { ProcessVersionId = version.Id, FromStateId = review.Id, ToStateId = end.Id, ActionTitle = "تایید" };
        var bigApprove = new BpmsTransition
        {
            ProcessVersionId = version.Id, FromStateId = review.Id, ToStateId = end.Id, ActionTitle = "تایید مبلغ بالا",
            Rules = { new BpmsTransitionRule { VariableName = "Amount", Operator = ">", Value = "1000" } }
        };
        var withAction = new BpmsTransition { ProcessVersionId = version.Id, FromStateId = review.Id, ToStateId = end.Id, ActionTitle = "قطعی", ActionCode = "TEST_ACTION" };
        _db.AddRange(submit, approve, bigApprove, withAction);
        _db.SaveChanges();

        (_startStateId, _reviewStateId, _endStateId) = (start.Id, review.Id, end.Id);
        (_submitId, _approveId, _bigApproveId, _actionId) = (submit.Id, approve.Id, bigApprove.Id, withAction.Id);
    }

    private sealed class RecordingHandler : IBpmsActionHandler
    {
        public List<BpmsActionContext> Calls { get; } = new();

        public Task ExecuteAsync(BpmsActionContext context, CancellationToken cancellationToken)
        {
            Calls.Add(context);
            return Task.CompletedTask;
        }
    }

    private sealed class FakeActionResolver : IBpmsActionResolver
    {
        public bool Known { get; set; } = true;
        public RecordingHandler Handler { get; } = new();
        public IBpmsActionHandler? Resolve(string actionCode) => Known && actionCode == "TEST_ACTION" ? Handler : null;
    }
}
