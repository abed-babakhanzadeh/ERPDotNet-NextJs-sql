using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Modules.Workflow.Commands.CompleteTask;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.Controllers.Workflow;

[Route("api/Workflow/[controller]")] // هماهنگ با استایل [Route("api/Inventory/[controller]")]
[ApiController]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly IMediator _mediator;

    public TasksController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // 🌟 1. انتقال TaskId به URL (هماهنگ با الگوی docs/{id}/approve)
    [HttpPost("{id}/complete")]
    // 🌟 2. استفاده از اتریبیوت اختصاصی شما (اختیاری: چون اصولاً هرکس لاگین باشد می‌تواند تسک‌های کارتابل "خودش" را بزند، اما برای یکدستی اضافه شد)
    [HasPermission("Workflow.Tasks.Complete")] 
    public async Task<IActionResult> CompleteTask(long id, [FromBody] CompleteTaskCommand command)
    {
        // 🌟 3. اعتبارسنجی مغایرت (دقیقاً مثل کنترلر انبار)
        if (id != command.TaskId) 
            return BadRequest("شناسه وظیفه (تسک) در آدرس و بدنه درخواست مغایرت دارد.");

        await _mediator.Send(command);
        
        // 🌟 4. خروجی یکدست با سایر کنترلرها
        return Ok(new { message = "وظیفه با موفقیت انجام شد و پرونده به مرحله بعد ارجاع یافت." });
    }
}