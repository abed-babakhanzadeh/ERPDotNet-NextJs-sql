using ERPDotNet.Domain.Modules.BaseInfo.Entities; // فضای نامی که Enumها هستند
using Microsoft.AspNetCore.Mvc;
using ERPDotNet.Application.Common.Extensions; // فرض بر اینکه متد ToDisplay دارید

namespace ERPDotNet.API.Controllers.Common;

[Route("api/Common/[controller]")]
[ApiController]
public class EnumsController : ControllerBase
{
    [HttpGet("ProductSupplyType")]
    public IActionResult GetProductSupplyTypes()
    {
        var values = Enum.GetValues(typeof(ProductSupplyType))
            .Cast<ProductSupplyType>()
            .Select(e => new 
            { 
                Id = (int)e, 
                Title = e.ToDisplay() // یا e.ToString() اگر متد ToDisplay ندارید
            })
            .ToList();

        return Ok(values);
    }
}