using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.Production.Commands.ChangeProductionOrderStatus;
using ERPDotNet.Application.Modules.Production.Commands.CreateProductionOrder;
using ERPDotNet.Application.Modules.Production.Commands.DeleteProductionOrder;
using ERPDotNet.Application.Modules.Production.Commands.ExecuteProductionOrder;
using ERPDotNet.Application.Modules.Production.Commands.OperationReports;
using ERPDotNet.Application.Modules.Production.Commands.UpdateProductionOrder;
using ERPDotNet.Application.Modules.Production.Queries.GetProductionOrderCost;
using ERPDotNet.Application.Modules.Production.Queries.GetProductionOrderOperations;
using ERPDotNet.Application.Modules.Production.Queries.GetProductionOrderProgress;
using ERPDotNet.Application.Modules.Production.Queries.GetProductionOrders;
using ERPDotNet.Application.Modules.Production.Queries.GetProductionRequirements;
using ERPDotNet.Application.Modules.Production.Queries.GetProductionVarianceReport;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.Controllers.Production;

[Route("api/Production/Orders")]
[ApiController]
[HasPermission("Production.Orders")]
public class ProductionOrdersController : ControllerBase
{
    private readonly IMediator _mediator;

    public ProductionOrdersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("search")]
    public async Task<ActionResult<PaginatedResult<ProductionOrderListDto>>> Search([FromBody] GetProductionOrdersQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    // گزارش انحراف مقداری مصرف مواد (استاندارد در برابر واقعی)
    [HttpPost("variance")]
    public async Task<ActionResult<PaginatedResult<ProductionVarianceSummaryDto>>> Variance([FromBody] GetProductionVarianceReportQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProductionOrderDto>> GetById(int id)
    {
        var result = await _mediator.Send(new GetProductionOrderByIdQuery(id));
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpGet("{id}/progress")]
    public async Task<ActionResult<ProductionOrderProgressDto>> GetProgress(int id)
    {
        return Ok(await _mediator.Send(new GetProductionOrderProgressQuery(id)));
    }

    // بهای ریالی سفارش: مواد، کارکرد مراکز کاری و ارزش رسیدها
    [HttpGet("{id}/cost")]
    [HasPermission("Production.Orders.Cost")]
    public async Task<ActionResult<ProductionOrderCostDto>> GetCost(int id)
    {
        return Ok(await _mediator.Send(new GetProductionOrderCostQuery(id)));
    }

    [HttpGet("{id}/operations")]
    public async Task<ActionResult<List<ProductionOperationDto>>> GetOperations(int id)
    {
        return Ok(await _mediator.Send(new GetProductionOrderOperationsQuery(id)));
    }

    [HttpGet("boms")]
    public async Task<ActionResult<List<ProductionBomOptionDto>>> GetBoms([FromQuery] int productId)
    {
        return Ok(await _mediator.Send(new GetProductionBomsQuery(productId)));
    }

    [HttpPost("requirements")]
    public async Task<ActionResult<ProductionRequirementsDto>> GetRequirements([FromBody] GetProductionRequirementsQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    [HttpPost]
    [HasPermission("Production.Orders.Create")]
    public async Task<IActionResult> Create([FromBody] CreateProductionOrderCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPut("{id}")]
    [HasPermission("Production.Orders.Edit")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProductionOrderCommand command)
    {
        if (id != command.Id) return BadRequest();
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpPost("{id}/release")]
    [HasPermission("Production.Orders.Release")]
    public async Task<IActionResult> Release(int id)
    {
        await _mediator.Send(new ReleaseProductionOrderCommand(id));
        return NoContent();
    }

    [HttpPost("{id}/cancel")]
    [HasPermission("Production.Orders.Release")]
    public async Task<IActionResult> Cancel(int id)
    {
        await _mediator.Send(new CancelProductionOrderCommand(id));
        return NoContent();
    }

    [HttpPost("{id}/issue")]
    [HasPermission("Production.Orders.Execute")]
    public async Task<ActionResult<long>> IssueMaterials(int id, [FromBody] IssueProductionMaterialsCommand command)
    {
        if (id != command.Id) return BadRequest();
        return Ok(await _mediator.Send(command));
    }

    [HttpPost("{id}/receive")]
    [HasPermission("Production.Orders.Execute")]
    public async Task<ActionResult<long>> ReceiveOutput(int id, [FromBody] ReceiveProductionOutputCommand command)
    {
        if (id != command.Id) return BadRequest();
        return Ok(await _mediator.Send(command));
    }

    [HttpPost("{id}/operations/reports")]
    [HasPermission("Production.Orders.Execute")]
    public async Task<ActionResult<int>> ReportOperation(int id, [FromBody] ReportOperationCommand command)
    {
        if (id != command.OrderId) return BadRequest();
        return Ok(await _mediator.Send(command));
    }

    [HttpDelete("{id}/operations/reports/{reportId}")]
    [HasPermission("Production.Orders.Execute")]
    public async Task<IActionResult> DeleteOperationReport(int id, int reportId)
    {
        await _mediator.Send(new DeleteOperationReportCommand(id, reportId));
        return NoContent();
    }

    [HttpPost("{id}/complete")]
    [HasPermission("Production.Orders.Execute")]
    public async Task<IActionResult> Complete(int id)
    {
        await _mediator.Send(new CompleteProductionOrderCommand(id));
        return NoContent();
    }

    [HttpDelete("{id}")]
    [HasPermission("Production.Orders.Delete")]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteProductionOrderCommand(id));
        return NoContent();
    }
}
