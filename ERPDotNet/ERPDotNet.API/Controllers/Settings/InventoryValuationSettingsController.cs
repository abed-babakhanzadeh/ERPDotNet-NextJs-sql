using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Modules.Inventory.Commands.ValuationSettings;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.Controllers.Settings;

[Route("api/Settings/InventoryValuation")]
[ApiController]
[HasPermission("Settings.InventoryValuation")]
public class InventoryValuationSettingsController : ControllerBase
{
    private readonly IMediator _mediator;

    public InventoryValuationSettingsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<ActionResult<ValuationSettingsDto>> Get()
    {
        return Ok(await _mediator.Send(new GetValuationSettingsQuery()));
    }

    [HttpPut]
    [HasPermission("Settings.InventoryValuation.Edit")]
    public async Task<IActionResult> Update([FromBody] UpdateValuationSettingsCommand command)
    {
        await _mediator.Send(command);
        return NoContent();
    }
}
