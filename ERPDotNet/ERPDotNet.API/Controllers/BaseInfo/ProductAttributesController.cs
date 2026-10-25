using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.BaseInfo.Commands.CreateProductAttribute;
using ERPDotNet.Application.Modules.BaseInfo.Commands.DeleteProductAttribute;
using ERPDotNet.Application.Modules.BaseInfo.Commands.UpdateProductAttribute;
using ERPDotNet.Application.Modules.BaseInfo.Queries.GetProductAttributes;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.Controllers.BaseInfo;

[Route("api/BaseInfo/[controller]")]
[ApiController]
[Authorize]
public class ProductAttributesController : ControllerBase
{
    private readonly IMediator _mediator;

    public ProductAttributesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // برای دراپ‌داون فرم‌های ماژول‌های دیگر؛ فقط ورود کاربر لازم است
    [HttpGet("lookup")]
    public async Task<ActionResult<List<ProductAttributeDto>>> GetLookup()
    {
        return Ok(await _mediator.Send(new GetProductAttributesLookupQuery()));
    }

    [HttpPost("search")]
    [HasPermission("BaseInfo.ProductAttributes")]
    public async Task<ActionResult<PaginatedResult<ProductAttributeDto>>> Search([FromBody] GetProductAttributesQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    [HttpGet("{id}")]
    [HasPermission("BaseInfo.ProductAttributes")]
    public async Task<ActionResult<ProductAttributeDto>> GetById(int id)
    {
        var result = await _mediator.Send(new GetProductAttributeByIdQuery(id));
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost]
    [HasPermission("BaseInfo.ProductAttributes.Create")]
    public async Task<IActionResult> Create([FromBody] CreateProductAttributeCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPut("{id}")]
    [HasPermission("BaseInfo.ProductAttributes.Edit")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProductAttributeCommand command)
    {
        if (id != command.Id) return BadRequest();
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [HasPermission("BaseInfo.ProductAttributes.Delete")]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteProductAttributeCommand(id));
        return NoContent();
    }
}
