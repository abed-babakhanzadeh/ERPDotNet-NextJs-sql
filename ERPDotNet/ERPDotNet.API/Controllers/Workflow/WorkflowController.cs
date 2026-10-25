using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.Workflow.Commands.CompleteTask;
using ERPDotNet.Application.Modules.Workflow.Commands.Delegations;
using ERPDotNet.Application.Modules.Workflow.DTOs;
using ERPDotNet.Application.Modules.Workflow.Queries.GetDelegations;
using ERPDotNet.Application.Modules.Workflow.Queries.GetInboxTasks;
using ERPDotNet.Application.Modules.Workflow.Queries.GetTaskDetails;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.Controllers.Workflow;

// 🌟 این روت باعث می‌شود آدرس پایه بشود: /api/Workflow/Tasks
[Route("api/Workflow/[controller]")] 
[ApiController]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly IMediator _mediator;

    public TasksController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // 🌟 آدرس نهایی: POST /api/Workflow/Tasks/inbox
    [HttpPost("inbox")]
    [HasPermission("Workflow.Tasks.Inbox")]
    public async Task<ActionResult<PaginatedResult<InboxTaskDto>>> GetInboxTasks([FromBody] GetInboxTasksQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    // 🌟 آدرس نهایی: GET /api/Workflow/Tasks/{id}
    [HttpGet("{id}")]
    [HasPermission("Workflow.Tasks.View")]
    public async Task<ActionResult<TaskDetailsDto>> GetTaskDetails(long id)
    {
        return Ok(await _mediator.Send(new GetTaskDetailsQuery(id)));
    }

    // 🌟 آدرس نهایی: POST /api/Workflow/Tasks/{id}/complete
    [HttpPost("{id}/complete")]
    [HasPermission("Workflow.Tasks.Complete")]
    public async Task<IActionResult> CompleteTask(long id, [FromBody] CompleteTaskCommand command)
    {
        if (id != command.TaskId)
            throw new FluentValidation.ValidationException("شناسه مغایرت دارد.");

        await _mediator.Send(command);
        return Ok(new { message = "وظیفه با موفقیت انجام شد." });
    }

    // ==========================================
    // بخش مدیریت گردش کار (Workflow Builder)
    // ==========================================

    [HttpPost("processes/list")]
    [HasPermission("Workflow.Processes.View")]
    public async Task<ActionResult<PaginatedResult<ProcessDto>>> GetAllProcesses([FromBody] ERPDotNet.Application.Modules.Workflow.Queries.GetAllProcesses.GetAllProcessesQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    [HttpPost("processes")]
    [HasPermission("Workflow.Processes.Create")]
    public async Task<ActionResult<int>> CreateProcess([FromBody] ERPDotNet.Application.Modules.Workflow.Commands.CreateProcess.CreateProcessCommand command)
    {
        var id = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetAllProcesses), new { id }, id);
    }

    // ==========================================
    // بخش مدیریت گردش کار (Workflow Builder) - فاز 2
    // ==========================================

    [HttpGet("processes/{id}")]
    [HasPermission("Workflow.Processes.View")]
    public async Task<ActionResult<ProcessDetailsDto>> GetProcessDetails(int id)
    {
        return Ok(await _mediator.Send(new ERPDotNet.Application.Modules.Workflow.Queries.GetProcessDetails.GetProcessDetailsQuery(id)));
    }

    [HttpPost("states")]
    [HasPermission("Workflow.Processes.Edit")]
    public async Task<ActionResult<int>> CreateState([FromBody] ERPDotNet.Application.Modules.Workflow.Commands.CreateState.CreateStateCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(id);
    }

    [HttpPost("transitions")]
    [HasPermission("Workflow.Processes.Edit")]
    public async Task<ActionResult<int>> CreateTransition([FromBody] ERPDotNet.Application.Modules.Workflow.Commands.CreateTransition.CreateTransitionCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(id);
    }

    // مهلت انجام و نقش ارجاع مرحله
    [HttpPut("states/{id}/sla")]
    [HasPermission("Workflow.Processes.Edit")]
    public async Task<IActionResult> UpdateStateSla(int id, [FromBody] ERPDotNet.Application.Modules.Workflow.Commands.UpdateStateSla.UpdateStateSlaCommand command)
    {
        if (id != command.Id) throw new FluentValidation.ValidationException("شناسه مغایرت دارد.");
        await _mediator.Send(command);
        return NoContent();
    }

    // ==========================================
    // تفویض اختیار کارتابل
    // ==========================================

    [HttpGet("delegations")]
    [HasPermission("Workflow.Tasks.Delegate")]
    public async Task<ActionResult<List<DelegationDto>>> GetDelegations()
    {
        return Ok(await _mediator.Send(new GetDelegationsQuery()));
    }

    [HttpGet("delegations/users")]
    [HasPermission("Workflow.Tasks.Delegate")]
    public async Task<ActionResult<List<DelegateUserDto>>> GetDelegateUsers()
    {
        return Ok(await _mediator.Send(new GetDelegateUsersQuery()));
    }

    [HttpPost("delegations")]
    [HasPermission("Workflow.Tasks.Delegate")]
    public async Task<ActionResult<int>> CreateDelegation([FromBody] CreateDelegationCommand command)
    {
        return Ok(await _mediator.Send(command));
    }

    [HttpPost("delegations/{id}/revoke")]
    [HasPermission("Workflow.Tasks.Delegate")]
    public async Task<IActionResult> RevokeDelegation(int id)
    {
        await _mediator.Send(new RevokeDelegationCommand(id));
        return NoContent();
    }

    // جایگزینی نقش‌های مجاز یک دکمه؛ لیست خالی = آزاد برای همه
    [HttpPut("transitions/{id}/roles")]
    [HasPermission("Workflow.Processes.Edit")]
    public async Task<IActionResult> UpdateTransitionRoles(int id, [FromBody] List<string> roleIds)
    {
        await _mediator.Send(new ERPDotNet.Application.Modules.Workflow.Commands.UpdateTransitionRoles.UpdateTransitionRolesCommand(id, roleIds));
        return NoContent();
    }

    // فهرست نقش‌ها برای انتخاب در طراح
    [HttpGet("roles")]
    [HasPermission("Workflow.Processes.Edit")]
    public async Task<ActionResult<List<TransitionRoleDto>>> GetWorkflowRoles()
    {
        return Ok(await _mediator.Send(new ERPDotNet.Application.Modules.Workflow.Queries.GetWorkflowRoles.GetWorkflowRolesQuery()));
    }


    // ابزار توسعه: فرآیند INVENTORY_V1 و همه نمونه‌ها و کارهایش را پاک و از نو می‌سازد.
    // فقط در محیط Development و برای کاربر دارای مجوز ویرایش فرآیند در دسترس است.
    [HttpGet("ultimate-seed")]
    [HasPermission("Workflow.Processes.Edit")]
    public async Task<IActionResult> UltimateSeed(
        [FromServices] ERPDotNet.Application.Common.Interfaces.IApplicationDbContext context,
        [FromServices] IWebHostEnvironment environment)
    {
        if (!environment.IsDevelopment()) return NotFound();

        string newProcessCode = "INVENTORY_V1";

        // 1. پاکسازی کامل و سلسله‌مراتبی (از پایین‌ترین سطح به بالاترین سطح برای جلوگیری از خطای FK)
        var oldTasks = context.BpmsTasks.Where(x => x.Instance.ProcessVersion.Process.ProcessCode == newProcessCode);
        context.BpmsTasks.RemoveRange(oldTasks);

        var oldHistories = context.BpmsHistories.Where(x => x.Instance.ProcessVersion.Process.ProcessCode == newProcessCode);
        context.BpmsHistories.RemoveRange(oldHistories);

        var oldInstances = context.BpmsInstances.Where(x => x.ProcessVersion.Process.ProcessCode == newProcessCode);
        context.BpmsInstances.RemoveRange(oldInstances);

        var oldTransitions = context.BpmsTransitions.Where(x => x.ProcessVersion.Process.ProcessCode == newProcessCode);
        context.BpmsTransitions.RemoveRange(oldTransitions);

        var oldStates = context.BpmsStates.Where(x => x.ProcessVersion.Process.ProcessCode == newProcessCode);
        context.BpmsStates.RemoveRange(oldStates);

        var oldVersions = context.BpmsProcessVersions.Where(x => x.Process.ProcessCode == newProcessCode);
        context.BpmsProcessVersions.RemoveRange(oldVersions);

        var oldProcesses = context.BpmsProcesses.Where(x => x.ProcessCode == newProcessCode);
        context.BpmsProcesses.RemoveRange(oldProcesses);

        await context.SaveChangesAsync(CancellationToken.None);

        // 2. ساخت فرآیند با مقادیر دقیق کلاس دامین
        var process = new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsProcess 
        { 
            CompanyId = 1, 
            ProcessCode = newProcessCode, 
            Title = "فرآیند تایید اسناد انبار (نسخه جدید)", 
            TargetEntityName = "InventoryDocHeader", 
            IsActive = true 
        };
        context.BpmsProcesses.Add(process);
        await context.SaveChangesAsync(CancellationToken.None);

        // 3. ساخت نسخه فرآیند
        var version = new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsProcessVersion 
        { 
            ProcessId = process.Id, 
            VersionNumber = 1, 
            IsActive = true 
        };
        context.BpmsProcessVersions.Add(version);
        await context.SaveChangesAsync(CancellationToken.None);

        // 4. ساخت مراحل
        var stateDraft = new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsState 
        { 
            ProcessVersionId = version.Id, 
            Title = "پیش‌نویس", 
            StateCode = "DRAFT", 
            Type = ERPDotNet.Domain.Modules.Workflow.Enums.BpmsStateType.Start 
        };
        
        var stateReview = new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsState 
        { 
            ProcessVersionId = version.Id, 
            Title = "در جریان بررسی مدیر", 
            StateCode = "REVIEW",
            Type = ERPDotNet.Domain.Modules.Workflow.Enums.BpmsStateType.Intermediate 
        };
        
        var statePosted = new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsState 
        { 
            ProcessVersionId = version.Id, 
            Title = "قطعی شده (کسر موجودی)", 
            StateCode = "POSTED",
            Type = ERPDotNet.Domain.Modules.Workflow.Enums.BpmsStateType.End 
        };
        
        context.BpmsStates.AddRange(stateDraft, stateReview, statePosted);
        await context.SaveChangesAsync(CancellationToken.None);

        // 5. ساخت دکمه‌ها
        var transitions = new List<ERPDotNet.Domain.Modules.Workflow.Entities.BpmsTransition>
        {
            new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsTransition { ProcessVersionId = version.Id, FromStateId = stateDraft.Id, ToStateId = stateReview.Id, ActionTitle = "ارسال برای تایید مدیر", IsActive = true, ActionCode = null },
            new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsTransition { ProcessVersionId = version.Id, FromStateId = stateReview.Id, ToStateId = statePosted.Id, ActionTitle = "تایید نهایی و کسر از انبار", IsActive = true, ActionCode = "INVENTORY_POST" },
            new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsTransition { ProcessVersionId = version.Id, FromStateId = stateReview.Id, ToStateId = stateDraft.Id, ActionTitle = "رد و ارجاع جهت اصلاح", IsActive = true, ActionCode = "INVENTORY_RETURN" }
        };
        
        context.BpmsTransitions.AddRange(transitions);
        await context.SaveChangesAsync(CancellationToken.None);

        return Ok($"جادوی نهایی با موفقیت اعمال شد! فرآیند جدید با کد {newProcessCode} و تمامی Property های دامین شما در دیتابیس نشست.");
    }
    
}