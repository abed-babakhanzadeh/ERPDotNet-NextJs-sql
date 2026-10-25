using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.BaseInfo.Commands.CreateCostCenter;
using ERPDotNet.Application.Modules.BaseInfo.Commands.DeleteCostCenter;
using ERPDotNet.Application.Modules.BaseInfo.Commands.UpdateCostCenter;
using ERPDotNet.Application.Modules.BaseInfo.Queries.GetCostCenters;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.Controllers.BaseInfo;

[Route("api/BaseInfo/[controller]")]
[ApiController]
[Authorize]
public class CostCentersController : ControllerBase
{
    private readonly IMediator _mediator;

    public CostCentersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // برای دراپ‌داون فرم‌های ماژول‌های دیگر؛ فقط ورود کاربر لازم است
    [HttpGet("lookup")]
    public async Task<ActionResult<List<CostCenterDto>>> GetLookup()
    {
        return Ok(await _mediator.Send(new GetCostCentersLookupQuery()));
    }

    [HttpGet("types")]
    public IActionResult GetTypes()
    {
        return Ok(EnumExtensions.ToList<CostCenterType>());
    }

    [HttpPost("search")]
    [HasPermission("BaseInfo.CostCenters")]
    public async Task<ActionResult<PaginatedResult<CostCenterDto>>> Search([FromBody] GetCostCentersQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    [HttpGet("{id}")]
    [HasPermission("BaseInfo.CostCenters")]
    public async Task<ActionResult<CostCenterDto>> GetById(int id)
    {
        var result = await _mediator.Send(new GetCostCenterByIdQuery(id));
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost]
    [HasPermission("BaseInfo.CostCenters.Create")]
    public async Task<IActionResult> Create([FromBody] CreateCostCenterCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPut("{id}")]
    [HasPermission("BaseInfo.CostCenters.Edit")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCostCenterCommand command)
    {
        if (id != command.Id) return BadRequest();
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [HasPermission("BaseInfo.CostCenters.Delete")]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteCostCenterCommand(id));
        return NoContent();
    }
}
