using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.ProductEngineering.Commands.CopyBOM;
using ERPDotNet.Application.Modules.ProductEngineering.Commands.CreateBOM;
using ERPDotNet.Application.Modules.ProductEngineering.Commands.DeleteBOM;
using ERPDotNet.Application.Modules.ProductEngineering.Commands.UpdateBOM;
using ERPDotNet.Application.Modules.ProductEngineering.Queries.GetBOM;
using ERPDotNet.Application.Modules.ProductEngineering.Queries.GetBOMsList;
using ERPDotNet.Application.Modules.ProductEngineering.Queries.GetBOMTree;
using ERPDotNet.Application.Modules.ProductEngineering.Queries.GetNextBOMVersion;
using ERPDotNet.Application.Modules.ProductEngineering.Queries.GetWhereUsed;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.Controllers.ProductEngineering;

[Route("api/ProductEngineering/[controller]")]
[ApiController]
public class BOMsController : ControllerBase
{
    private readonly IMediator _mediator;

    public BOMsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("search")]
    [HasPermission("ProductEngineering.BOM.View")]
    public async Task<ActionResult<PaginatedResult<BOMListDto>>> Search([FromBody] GetBOMsListQuery query)
    {
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpGet("{id}")]
    [HasPermission("ProductEngineering.BOM.View")]
    public async Task<ActionResult<BOMDto>> GetById(int id)
    {
        // وارنینگ رفع شد: استفاده از Ok() برای بازگشت صریح
        var result = await _mediator.Send(new GetBOMQuery(id));
        return Ok(result);
    }

    [HttpGet("{id}/tree")]
    [HasPermission("ProductEngineering.BOM.View")]
    public async Task<ActionResult<BOMTreeNodeDto>> GetTree(int id)
    {
        var result = await _mediator.Send(new GetBOMTreeQuery(id));
        return Ok(result);
    }

    [HttpPost("where-used")]
    [HasPermission("ProductEngineering.BOM.View")]
    public async Task<ActionResult<PaginatedResult<WhereUsedDto>>> WhereUsed([FromBody] GetWhereUsedQuery query)
    {
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    // متد دریافت ورژن بعدی (که باعث استفاده از Using بالا می‌شود)
    [HttpGet("products/{productId}/next-version")]
    [HasPermission("ProductEngineering.BOM.View")]
    public async Task<ActionResult<int>> GetNextVersion(int productId)
    {
        var version = await _mediator.Send(new GetNextBOMVersionQuery(productId));
        return Ok(version);
    }

    [HttpPost]
    [HasPermission("ProductEngineering.BOM.Create")]
    public async Task<ActionResult<int>> Create([FromBody] CreateBOMCommand command)
    {
        var id = await _mediator.Send(command);
        // بازگشت کد 201 Created به همراه آدرس متد GetById (استاندارد REST)
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    [HttpPut("{id}")]
    [HasPermission("ProductEngineering.BOM.Edit")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateBOMCommand command)
    {
        if (id != command.Id) return BadRequest("شناسه مسیر با شناسه بدنه درخواست همخوانی ندارد.");
        
        await _mediator.Send(command);
        return NoContent(); // استاندارد برای آپدیت موفق
    }

    [HttpDelete("{id}")]
    [HasPermission("ProductEngineering.BOM.Delete")]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteBOMCommand { Id = id });
        return NoContent();
    }

    [HttpPost("copy")]
    [HasPermission("ProductEngineering.BOM.Create")]
    public async Task<ActionResult<int>> Copy([FromBody] CopyBOMCommand command)
    {
        var newId = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetById), new { id = newId }, newId);
    }
}