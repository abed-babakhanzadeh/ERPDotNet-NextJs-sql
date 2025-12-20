using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.ProductEngineering.Commands.CopyBOM;
using ERPDotNet.Application.Modules.ProductEngineering.Commands.CreateBOM;
using ERPDotNet.Application.Modules.ProductEngineering.Commands.DeleteBOM;
using ERPDotNet.Application.Modules.ProductEngineering.Commands.UpdateBOM;
using ERPDotNet.Application.Modules.ProductEngineering.Queries.GetBOM;
using ERPDotNet.Application.Modules.ProductEngineering.Queries.GetBOMsList;
using ERPDotNet.Application.Modules.ProductEngineering.Queries.GetBOMTree;
using ERPDotNet.Application.Modules.ProductEngineering.Queries.GetWhereUsed;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.Controllers.ProductEngineering;

// اصلاح روت: اضافه کردن ProductEngineering
[Route("api/ProductEngineering/[controller]")]
[ApiController]
[HasPermission("ProductEngineering")]
public class BOMsController : ControllerBase
{
    private readonly IMediator _mediator;

    public BOMsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("search")]
    public async Task<ActionResult<PaginatedResult<BOMListDto>>> Search([FromBody] GetBOMsListQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<BOMDto>> GetById(int id)
    {
        var bom = await _mediator.Send(new GetBOMQuery(id));
        if (bom == null) return NotFound();
        return Ok(bom);
    }

    [HttpGet("{id}/tree")]
    public async Task<ActionResult<BOMTreeNodeDto>> GetTree(int id)
    {
        var result = await _mediator.Send(new GetBOMTreeQuery(id));
        return Ok(result);
    }

    [HttpPost("where-used")]
    public async Task<ActionResult<PaginatedResult<WhereUsedDto>>> WhereUsed([FromBody] GetWhereUsedQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    [HttpPost]
    [HasPermission("ProductEngineering.BOM.Create")]
    public async Task<IActionResult> Create([FromBody] CreateBOMCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPut("{id}")]
    [HasPermission("ProductEngineering.BOM.Create")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateBOMCommand command)
    {
        if (id != command.Id) return BadRequest();
        
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [HasPermission("ProductEngineering.BOM.Create")]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteBOMCommand { Id = id });
        return NoContent();
    }

    [HttpPost("{id}/copy")]
    [HasPermission("ProductEngineering.BOM.Create")]
    public async Task<IActionResult> Copy(int id, [FromBody] CopyBOMCommand command)
    {
        if (id != command.SourceBomId) return BadRequest();
        var newId = await _mediator.Send(command);
        return Ok(new { id = newId });
    }
}