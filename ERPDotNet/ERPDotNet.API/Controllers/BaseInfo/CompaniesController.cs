using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.BaseInfo.Commands.CreateCompany;
using ERPDotNet.Application.Modules.BaseInfo.Commands.DeleteCompany;
using ERPDotNet.Application.Modules.BaseInfo.Commands.UpdateCompany;
using ERPDotNet.Application.Modules.BaseInfo.Queries.GetCompanies;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.Controllers.BaseInfo;

[Route("api/BaseInfo/[controller]")]
[ApiController]
[Authorize]
public class CompaniesController : ControllerBase
{
    private readonly IMediator _mediator;

    public CompaniesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // برای دراپ‌داون فرم‌های ماژول‌های دیگر؛ فقط ورود کاربر لازم است
    [HttpGet("lookup")]
    public async Task<ActionResult<List<CompanyDto>>> GetLookup()
    {
        return Ok(await _mediator.Send(new GetCompaniesLookupQuery()));
    }

    [HttpPost("search")]
    [HasPermission("BaseInfo.Companies")]
    public async Task<ActionResult<PaginatedResult<CompanyDto>>> Search([FromBody] GetCompaniesQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    [HttpGet("{id}")]
    [HasPermission("BaseInfo.Companies")]
    public async Task<ActionResult<CompanyDto>> GetById(int id)
    {
        var result = await _mediator.Send(new GetCompanyByIdQuery(id));
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost]
    [HasPermission("BaseInfo.Companies.Create")]
    public async Task<IActionResult> Create([FromBody] CreateCompanyCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPut("{id}")]
    [HasPermission("BaseInfo.Companies.Edit")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCompanyCommand command)
    {
        if (id != command.Id) return BadRequest();
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [HasPermission("BaseInfo.Companies.Delete")]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteCompanyCommand(id));
        return NoContent();
    }
}
