using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.BaseInfo.Commands.CreateProduct;
using ERPDotNet.Application.Modules.BaseInfo.Commands.DeleteProduct;
using ERPDotNet.Application.Modules.BaseInfo.Commands.UpdateProduct;
using ERPDotNet.Application.Modules.BaseInfo.Queries.GetAllProducts;
using ERPDotNet.Application.Modules.BaseInfo.Queries.GetProductById;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.Controllers.BaseInfo;

[Route("api/BaseInfo/[controller]")]
[ApiController]
[HasPermission("BaseInfo.Products")]
public class ProductsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ProductsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("search")]
    public async Task<ActionResult<PaginatedResult<ProductDto>>> GetAll([FromBody] GetAllProductsQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProductDto>> GetById(int id)
    {
        var product = await _mediator.Send(new GetProductByIdQuery(id));
        if (product == null) return NotFound();
        return Ok(product);
    }

    [HttpPost]
    [HasPermission("BaseInfo.Products.Create")]
    public async Task<IActionResult> Create([FromBody] CreateProductCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPut("{id}")]
    [HasPermission("BaseInfo.Products.Edit")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProductCommand command)
    {
        if (id != command.Id) return BadRequest();

        // command.RowVersion باید در بادی جیسون موجود باشد
        await _mediator.Send(command);
        
        return NoContent();
    }

    [HttpDelete("{id}")]
    [HasPermission("BaseInfo.Products.Delete")]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteProductCommand(id));
        return NoContent();
    }
}