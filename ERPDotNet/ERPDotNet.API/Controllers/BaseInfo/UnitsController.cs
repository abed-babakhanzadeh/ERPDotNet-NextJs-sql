using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.BaseInfo.Commands.CreateUnit;
using ERPDotNet.Application.Modules.BaseInfo.Commands.DeleteUnit;
using ERPDotNet.Application.Modules.BaseInfo.Commands.UpdateUnit;
using ERPDotNet.Application.Modules.BaseInfo.Queries.GetAllUnits;
using ERPDotNet.Application.Modules.BaseInfo.Queries.GetUnitById;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.Controllers.BaseInfo;

// اصلاح روت: اضافه کردن BaseInfo به آدرس
[Route("api/BaseInfo/[controller]")] 
[ApiController]
[HasPermission("BaseInfo.Units")]
public class UnitsController : ControllerBase
{
    private readonly IMediator _mediator;

    public UnitsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // متد مخصوص دراپ‌داون‌ها (بدون صفحه‌بندی)
    [HttpGet("lookup")]
    public async Task<ActionResult<List<UnitDto>>> GetLookup()
    {
        // مطمئن شوید GetUnitsLookupQuery در پروژه Application وجود دارد
        // اگر ندارد، فعلا از GetAllUnitsQuery استفاده کنید یا آن را بسازید
        return Ok(await _mediator.Send(new GetUnitsLookupQuery()));
    }

    [HttpPost("search")]
    public async Task<ActionResult<PaginatedResult<UnitDto>>> Search([FromBody] GetAllUnitsQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UnitDto>> GetById(int id)
    {
        var unit = await _mediator.Send(new GetUnitByIdQuery(id));
        if (unit == null) return NotFound();
        return Ok(unit);
    }

    [HttpPost]
    [HasPermission("BaseInfo.Units.Create")]
    public async Task<IActionResult> Create([FromBody] CreateUnitCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPut("{id}")]
    [HasPermission("BaseInfo.Units.Edit")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUnitCommand command)
    {
        if (id != command.Id) return BadRequest();
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [HasPermission("BaseInfo.Units.Delete")]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteUnitCommand(id));
        return NoContent();
    }
}