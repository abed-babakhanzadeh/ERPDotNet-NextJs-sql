using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Modules.Production.Queries.GetMaterialPlan;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.Controllers.Production;

[Route("api/Production/Planning")]
[ApiController]
[HasPermission("Production.Planning")]
public class ProductionPlanningController : ControllerBase
{
    private readonly IMediator _mediator;

    public ProductionPlanningController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // برنامه‌ریزی چندسطحی مواد و کسری سفارش‌های باز
    [HttpPost("materials")]
    public async Task<ActionResult<MaterialPlanDto>> Materials([FromBody] GetMaterialPlanQuery query)
    {
        return Ok(await _mediator.Send(query));
    }
}
