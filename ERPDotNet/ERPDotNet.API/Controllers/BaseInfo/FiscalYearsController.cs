using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.BaseInfo.Commands.CreateFiscalYear;
using ERPDotNet.Application.Modules.BaseInfo.Commands.DeleteFiscalYear;
using ERPDotNet.Application.Modules.BaseInfo.Commands.UpdateFiscalYear;
using ERPDotNet.Application.Modules.BaseInfo.Queries.GetFiscalYears;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.Controllers.BaseInfo;

[Route("api/BaseInfo/[controller]")]
[ApiController]
[Authorize]
public class FiscalYearsController : ControllerBase
{
    private readonly IMediator _mediator;

    public FiscalYearsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // برای دراپ‌داون فرم‌های ماژول‌های دیگر؛ فقط ورود کاربر لازم است
    [HttpGet("lookup")]
    public async Task<ActionResult<List<FiscalYearDto>>> GetLookup([FromQuery] int? companyId)
    {
        return Ok(await _mediator.Send(new GetFiscalYearsLookupQuery(companyId)));
    }

    [HttpGet("statuses")]
    public IActionResult GetStatuses()
    {
        return Ok(EnumExtensions.ToList<FiscalYearStatus>());
    }

    [HttpPost("search")]
    [HasPermission("BaseInfo.FiscalYears")]
    public async Task<ActionResult<PaginatedResult<FiscalYearDto>>> Search([FromBody] GetFiscalYearsQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    [HttpGet("{id}")]
    [HasPermission("BaseInfo.FiscalYears")]
    public async Task<ActionResult<FiscalYearDto>> GetById(int id)
    {
        var result = await _mediator.Send(new GetFiscalYearByIdQuery(id));
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost]
    [HasPermission("BaseInfo.FiscalYears.Create")]
    public async Task<IActionResult> Create([FromBody] CreateFiscalYearCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPut("{id}")]
    [HasPermission("BaseInfo.FiscalYears.Edit")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateFiscalYearCommand command)
    {
        if (id != command.Id) return BadRequest();
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [HasPermission("BaseInfo.FiscalYears.Delete")]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteFiscalYearCommand(id));
        return NoContent();
    }
}
