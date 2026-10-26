using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.Production.Commands.WorkCenters;
using ERPDotNet.Application.Modules.Production.Queries.GetWorkCenterLoad;
using ERPDotNet.Application.Modules.Production.Queries.GetWorkCenters;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.Controllers.Production;

[Route("api/Production/WorkCenters")]
[ApiController]
[Authorize]
public class WorkCentersController : ControllerBase
{
    private readonly IMediator _mediator;

    public WorkCentersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // برای فرم مسیر تولید در مهندسی محصول؛ فقط ورود کاربر لازم است
    [HttpGet("options")]
    public async Task<ActionResult<List<WorkCenterOptionDto>>> GetOptions()
    {
        return Ok(await _mediator.Send(new GetWorkCenterOptionsQuery()));
    }

    // بار مراکز کاری از عملیات سفارش‌های باز
    [HttpGet("load")]
    [HasPermission("Production.WorkCenters")]
    public async Task<ActionResult<List<WorkCenterLoadDto>>> GetLoad()
    {
        return Ok(await _mediator.Send(new GetWorkCenterLoadQuery()));
    }

    [HttpPost("search")]
    [HasPermission("Production.WorkCenters")]
    public async Task<ActionResult<PaginatedResult<WorkCenterDto>>> Search([FromBody] GetWorkCentersQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    [HttpGet("{id}")]
    [HasPermission("Production.WorkCenters")]
    public async Task<ActionResult<WorkCenterDto>> GetById(int id)
    {
        var result = await _mediator.Send(new GetWorkCenterByIdQuery(id));
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost]
    [HasPermission("Production.WorkCenters.Create")]
    public async Task<IActionResult> Create([FromBody] CreateWorkCenterCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPut("{id}")]
    [HasPermission("Production.WorkCenters.Edit")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateWorkCenterCommand command)
    {
        if (id != command.Id) return BadRequest();
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [HasPermission("Production.WorkCenters.Delete")]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteWorkCenterCommand(id));
        return NoContent();
    }
}
