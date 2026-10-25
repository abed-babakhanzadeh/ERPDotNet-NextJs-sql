using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.Inventory.Commands.StockCounts;
using ERPDotNet.Application.Modules.Inventory.Queries.StockCounts;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.Controllers.Inventory;

[Route("api/Inventory/[controller]")]
[ApiController]
[Authorize]
public class StockCountsController : ControllerBase
{
    private readonly IMediator _mediator;

    public StockCountsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("search")]
    [HasPermission("Inventory.StockCounts.View")]
    public async Task<ActionResult<PaginatedResult<StockCountListItemDto>>> Search([FromBody] GetStockCountsQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    [HttpGet("{id}")]
    [HasPermission("Inventory.StockCounts.View")]
    public async Task<ActionResult<StockCountDto>> GetById(int id)
    {
        var result = await _mediator.Send(new GetStockCountByIdQuery(id));
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [HasPermission("Inventory.StockCounts.Create")]
    public async Task<ActionResult<int>> Create([FromBody] CreateStockCountCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPut("{id}")]
    [HasPermission("Inventory.StockCounts.Edit")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateStockCountCommand command)
    {
        if (id != command.Id) throw new FluentValidation.ValidationException("شناسه در آدرس و بدنه درخواست مغایرت دارد.");
        await _mediator.Send(command);
        return Ok(new { message = "شمارش ذخیره شد." });
    }

    [HttpPost("{id}/finalize")]
    [HasPermission("Inventory.StockCounts.Finalize")]
    public async Task<ActionResult<FinalizeStockCountResult>> Finalize(int id, [FromBody] FinalizeStockCountCommand command)
    {
        if (id != command.Id) throw new FluentValidation.ValidationException("شناسه در آدرس و بدنه درخواست مغایرت دارد.");
        return Ok(await _mediator.Send(command));
    }
}
