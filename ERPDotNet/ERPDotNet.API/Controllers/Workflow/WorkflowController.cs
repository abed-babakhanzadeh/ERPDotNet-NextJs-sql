using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.Workflow.Commands.CompleteTask;
using ERPDotNet.Application.Modules.Workflow.DTOs;
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
            return BadRequest("شناسه مغایرت دارد.");

        await _mediator.Send(command);
        return Ok(new { message = "وظیفه با موفقیت انجام شد." });
    }





    // 🌟 یک API موقت برای ساختن اتوماتیک فرآیند و دکمه‌ها در دیتابیس
    [AllowAnonymous]
    [HttpGet("seed")]
    public async Task<IActionResult> SeedWorkflow([FromServices] ERPDotNet.Application.Common.Interfaces.IApplicationDbContext context)
    {
        // 1. بررسی اینکه آیا فرآیند قبلاً ساخته شده یا نه
        if (context.BpmsProcesses.Any(p => p.ProcessCode == "INVENTORY_DOC"))
            return Ok("دیتا قبلاً در دیتابیس وجود دارد.");

        // 2. ساخت فرآیند پایه
        var process = new Domain.Modules.Workflow.Entities.BpmsProcess { ProcessCode = "INVENTORY_DOC", Title = "فرآیند تایید اسناد انبار", IsActive = true, TargetEntityName = "InventoryDocument" };
        context.BpmsProcesses.Add(process);
        await context.SaveChangesAsync(CancellationToken.None);

        // 3. ساخت نسخه 1 از فرآیند
        var version = new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsProcessVersion { ProcessId = process.Id, VersionNumber = 1, IsActive = true };
        context.BpmsProcessVersions.Add(version);
        await context.SaveChangesAsync(CancellationToken.None);

        // 4. تعریف ایستگاه‌ها (مراحل)
        var stateDraft = new Domain.Modules.Workflow.Entities.BpmsState { ProcessVersionId = version.Id, StateCode = "DRAFT", Title = "پیش‌نویس" };
        var stateReview = new Domain.Modules.Workflow.Entities.BpmsState { ProcessVersionId = version.Id, StateCode = "REVIEW", Title = "در جریان بررسی مدیر" };
        var statePosted = new Domain.Modules.Workflow.Entities.BpmsState { ProcessVersionId = version.Id, StateCode = "POSTED", Title = "قطعی شده (کسر موجودی)" };
        
        context.BpmsStates.AddRange(stateDraft, stateReview, statePosted);
        await context.SaveChangesAsync(CancellationToken.None);

        // 5. تعریف یال‌ها (همان دکمه‌هایی که در فرانت‌اند رندر می‌شوند!)
        var transitions = new List<ERPDotNet.Domain.Modules.Workflow.Entities.BpmsTransition>
        {
            // دکمه ارسال از کارتابل کاربر به کارتابل مدیر (بدون اکشن بیزینسی)
            new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsTransition { ProcessVersionId = version.Id, FromStateId = stateDraft.Id, ToStateId = stateReview.Id, ActionTitle = "ارسال برای تایید مدیر", IsActive = true, ActionCode = null },
            
            // دکمه تایید نهایی که اکشن قطعی‌سازی انبار را بیدار می‌کند
            new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsTransition { ProcessVersionId = version.Id, FromStateId = stateReview.Id, ToStateId = statePosted.Id, ActionTitle = "تایید نهایی و کسر از انبار", IsActive = true, ActionCode = "INVENTORY_POST" },
            
            // دکمه برگشت زدن سند به کاربر
            new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsTransition { ProcessVersionId = version.Id, FromStateId = stateReview.Id, ToStateId = stateDraft.Id, ActionTitle = "رد و ارجاع جهت اصلاح", IsActive = true, ActionCode = null }
        };
        
        context.BpmsTransitions.AddRange(transitions);
        await context.SaveChangesAsync(CancellationToken.None);

        return Ok("تبریک! فرآیند، مراحل و دکمه‌ها با موفقیت در دیتابیس ساخته شدند.");
    }



    [AllowAnonymous]
    [HttpGet("hard-reset-seed")]
    public async Task<IActionResult> HardResetSeed([FromServices] ERPDotNet.Application.Common.Interfaces.IApplicationDbContext context)
    {
        // 1. پاکسازی کامل دیتای ناقص قبلی (حذف یال‌ها، وضعیت‌ها، نسخه‌ها و خود فرآیند)
        var oldTransitions = context.BpmsTransitions.Where(x => x.ProcessVersion.Process.ProcessCode == "INVENTORY_DOC");
        context.BpmsTransitions.RemoveRange(oldTransitions);
        
        var oldStates = context.BpmsStates.Where(x => x.ProcessVersion.Process.ProcessCode == "INVENTORY_DOC");
        context.BpmsStates.RemoveRange(oldStates);
        
        var oldVersions = context.BpmsProcessVersions.Where(x => x.Process.ProcessCode == "INVENTORY_DOC");
        context.BpmsProcessVersions.RemoveRange(oldVersions);
        
        var oldProcesses = context.BpmsProcesses.Where(x => x.ProcessCode == "INVENTORY_DOC");
        context.BpmsProcesses.RemoveRange(oldProcesses);

        await context.SaveChangesAsync(CancellationToken.None);

        // 2. ساخت مجدد، یکپارچه و دقیقِ فرآیند
        var process = new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsProcess 
        { 
            CompanyId = 1, // 🌟 تنظیم مستقیم شرکت برای ادمین
            ProcessCode = "INVENTORY_DOC", 
            Title = "فرآیند تایید اسناد انبار",
            TargetEntityName = "InventoryDocument",
            IsActive = true 
        };
        context.BpmsProcesses.Add(process);
        await context.SaveChangesAsync(CancellationToken.None);

        var version = new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsProcessVersion 
        { 
            ProcessId = process.Id, 
            VersionNumber = 1, 
            IsActive = true 
        };
        context.BpmsProcessVersions.Add(version);
        await context.SaveChangesAsync(CancellationToken.None);

        // 🌟 ساخت مرحله شروع (Start State) که موتور دنبال آن می‌گردد
        var stateDraft = new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsState 
        { 
            ProcessVersionId = version.Id,
            StateCode = "DRAFT",
            Title = "پیش‌نویس"
        };
        var stateReview = new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsState 
        { 
            ProcessVersionId = version.Id,
            StateCode = "REVIEW",
            Title = "در جریان بررسی مدیر"
        };
        var statePosted = new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsState 
        { 
            ProcessVersionId = version.Id,
            StateCode = "POSTED",
            Title = "قطعی شده (کسر موجودی)"
        };
        
        context.BpmsStates.AddRange(stateDraft, stateReview, statePosted);
        await context.SaveChangesAsync(CancellationToken.None);

        // تعریف یال‌ها (دکمه‌ها)
        var transitions = new List<ERPDotNet.Domain.Modules.Workflow.Entities.BpmsTransition>
        {
            new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsTransition { ProcessVersionId = version.Id, FromStateId = stateDraft.Id, ToStateId = stateReview.Id, ActionTitle = "ارسال برای تایید مدیر", IsActive = true, ActionCode = null },
            new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsTransition { ProcessVersionId = version.Id, FromStateId = stateReview.Id, ToStateId = statePosted.Id, ActionTitle = "تایید نهایی و کسر از انبار", IsActive = true, ActionCode = "INVENTORY_POST" },
            new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsTransition { ProcessVersionId = version.Id, FromStateId = stateReview.Id, ToStateId = stateDraft.Id, ActionTitle = "رد و ارجاع جهت اصلاح", IsActive = true, ActionCode = null }
        };
        
        context.BpmsTransitions.AddRange(transitions);
        await context.SaveChangesAsync(CancellationToken.None);

        return Ok("جادو انجام شد! دیتابیس کاملاً پاکسازی و با دقیق‌ترین مقادیر و اتصالات بازسازی گردید.");
    }



    [AllowAnonymous]
    [HttpGet("ultimate-seed")]
    public async Task<IActionResult> UltimateSeed([FromServices] ERPDotNet.Application.Common.Interfaces.IApplicationDbContext context)
    {
        // 1. تغییر نام فرآیند برای دور زدن کامل کش
        string newProcessCode = "INVENTORY_V1";

        // 2. پاکسازی دیتای قبلی
        var oldProcesses = context.BpmsProcesses.Where(x => x.ProcessCode == newProcessCode);
        context.BpmsProcesses.RemoveRange(oldProcesses);
        await context.SaveChangesAsync(CancellationToken.None);

        // 3. ساخت فرآیند با مقادیر دقیق کلاس دامین شما
        var process = new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsProcess 
        { 
            CompanyId = 1, 
            ProcessCode = newProcessCode, 
            Title = "فرآیند تایید اسناد انبار (نسخه جدید)", // 🌟 اصلاح شد
            TargetEntityName = "InventoryDocHeader", // 🌟 اضافه شد
            IsActive = true 
        };
        context.BpmsProcesses.Add(process);
        await context.SaveChangesAsync(CancellationToken.None);

        // 4. ساخت نسخه فرآیند
        var version = new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsProcessVersion 
        { 
            ProcessId = process.Id, 
            VersionNumber = 1, 
            IsActive = true 
        };
        context.BpmsProcessVersions.Add(version);
        await context.SaveChangesAsync(CancellationToken.None);

        // 5. ساخت مراحل با پراپرتی‌های دقیق کلاس BpmsState
        var stateDraft = new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsState 
        { 
            ProcessVersionId = version.Id, 
            Title = "پیش‌نویس", 
            StateCode = "DRAFT", // 🌟 فیلد اجباری اضافه شد
            Type = ERPDotNet.Domain.Modules.Workflow.Enums.BpmsStateType.Start // 🌟 اصلاح نام پراپرتی
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

        // 6. ساخت دکمه‌ها
        var transitions = new List<ERPDotNet.Domain.Modules.Workflow.Entities.BpmsTransition>
        {
            new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsTransition { ProcessVersionId = version.Id, FromStateId = stateDraft.Id, ToStateId = stateReview.Id, ActionTitle = "ارسال برای تایید مدیر", IsActive = true, ActionCode = null },
            new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsTransition { ProcessVersionId = version.Id, FromStateId = stateReview.Id, ToStateId = statePosted.Id, ActionTitle = "تایید نهایی و کسر از انبار", IsActive = true, ActionCode = "INVENTORY_POST" },
            new ERPDotNet.Domain.Modules.Workflow.Entities.BpmsTransition { ProcessVersionId = version.Id, FromStateId = stateReview.Id, ToStateId = stateDraft.Id, ActionTitle = "رد و ارجاع جهت اصلاح", IsActive = true, ActionCode = null }
        };
        
        context.BpmsTransitions.AddRange(transitions);
        await context.SaveChangesAsync(CancellationToken.None);

        return Ok($"جادوی نهایی با موفقیت اعمال شد! فرآیند جدید با کد {newProcessCode} و تمامی Property های دامین شما در دیتابیس نشست.");
    }
}