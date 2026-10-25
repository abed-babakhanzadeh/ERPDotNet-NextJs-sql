using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.BaseInfo.Commands.CreateProductCategory;
using ERPDotNet.Application.Modules.BaseInfo.Commands.DeleteProductCategory;
using ERPDotNet.Application.Modules.BaseInfo.Commands.UpdateProductCategory;
using ERPDotNet.Application.Modules.BaseInfo.Queries.GetProductCategories;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.Controllers.BaseInfo;

[Route("api/BaseInfo/[controller]")]
[ApiController]
[Authorize]
public class ProductCategoriesController : ControllerBase
{
    private readonly IMediator _mediator;

    public ProductCategoriesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // برای دراپ‌داون فرم‌های ماژول‌های دیگر؛ فقط ورود کاربر لازم است
    [HttpGet("lookup")]
    public async Task<ActionResult<List<ProductCategoryDto>>> GetLookup()
    {
        return Ok(await _mediator.Send(new GetProductCategoriesLookupQuery()));
    }

    [HttpPost("search")]
    [HasPermission("BaseInfo.ProductCategories")]
    public async Task<ActionResult<PaginatedResult<ProductCategoryDto>>> Search([FromBody] GetProductCategoriesQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    [HttpGet("{id}")]
    [HasPermission("BaseInfo.ProductCategories")]
    public async Task<ActionResult<ProductCategoryDto>> GetById(int id)
    {
        var result = await _mediator.Send(new GetProductCategoryByIdQuery(id));
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost]
    [HasPermission("BaseInfo.ProductCategories.Create")]
    public async Task<IActionResult> Create([FromBody] CreateProductCategoryCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPut("{id}")]
    [HasPermission("BaseInfo.ProductCategories.Edit")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProductCategoryCommand command)
    {
        if (id != command.Id) return BadRequest();
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [HasPermission("BaseInfo.ProductCategories.Delete")]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteProductCategoryCommand(id));
        return NoContent();
    }
}
