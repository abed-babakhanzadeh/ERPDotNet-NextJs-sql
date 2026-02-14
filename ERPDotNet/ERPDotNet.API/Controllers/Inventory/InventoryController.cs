using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.Inventory.Commands.ApproveInventoryDoc;
using ERPDotNet.Application.Modules.Inventory.Commands.CreateBatch;
using ERPDotNet.Application.Modules.Inventory.Commands.CreateInventoryDoc;
using ERPDotNet.Application.Modules.Inventory.Commands.CreateLocation;
using ERPDotNet.Application.Modules.Inventory.Commands.DefineDocType;
using ERPDotNet.Application.Modules.Inventory.Commands.DefineWarehouse;
using ERPDotNet.Application.Modules.Inventory.Commands.PostInventoryDoc;
using ERPDotNet.Application.Modules.Inventory.Commands.SetItemWarehouseSetting;
using ERPDotNet.Application.Modules.Inventory.Commands.ConfigureItemProfile;
using ERPDotNet.Application.Modules.Inventory.DTOs;
using ERPDotNet.Application.Modules.Inventory.Queries.GetCurrentStock;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ERPDotNet.Application.Modules.Inventory.Queries.GetProductCardex;
using ERPDotNet.Application.Modules.Inventory.Commands.DeleteInventoryDoc;
using ERPDotNet.Application.Modules.Inventory.Commands.RevertInventoryDoc;
using ERPDotNet.Application.Modules.Inventory.Commands.UpdateInventoryDoc;
using ERPDotNet.Application.Modules.Inventory.Queries.GetWarehouses;
using ERPDotNet.Application.Modules.Inventory.Queries.GetWarehouseById;
using ERPDotNet.Application.Modules.Inventory.Commands.DeleteWarehouse;
using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Application.Modules.Inventory.Commands.UpdateWarehouse;
using ERPDotNet.Application.Modules.Inventory.Queries.GetLocations;
using ERPDotNet.Application.Modules.Inventory.Queries.GetLocationById;
using ERPDotNet.Application.Modules.Inventory.Commands.UpdateLocation;
using ERPDotNet.Application.Modules.Inventory.Commands.DeleteLocation;

namespace ERPDotNet.API.Controllers.Inventory;

[Route("api/Inventory/[controller]")]
[ApiController]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly IMediator _mediator;

    public InventoryController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // ==========================================
    // 1. اطلاعات پایه (Master Data)
    // ==========================================

    [HttpPost("warehouses")]
    [HasPermission("Inventory.Warehouses.Define")] 
    public async Task<ActionResult<int>> DefineWarehouse([FromBody] DefineWarehouseCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPost("warehouses/list")] // استفاده از Post برای ارسال مدل پیچیده PaginatedRequest
    [HasPermission("Inventory.Warehouses.View")] 
    public async Task<ActionResult<PaginatedResult<WarehouseDto>>> GetWarehouses([FromBody] GetWarehousesQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    [HttpPost("doc-types")]
    // اصلاح شد: منطبق با Inventory.DocTypes.Define
    [HasPermission("Inventory.DocTypes.Define")]
    // نکته: نام کامند را طبق کد خودتان حفظ کردم
    public async Task<ActionResult<int>> DefineDocType([FromBody] DefineInventoryDocTypeCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPost("batches")]
    // اصلاح شد: چون بچ معمولا موقع سند زدن ساخته می‌شود، دسترسی سند را دادم (یا می‌توانید Inventory.BaseInfo بدهید)
    [HasPermission("Inventory.Docs.Create")]
    public async Task<ActionResult<int>> CreateBatch([FromBody] CreateInventoryBatchCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPost("settings/item")]
    // اصلاح شد: دسترسی کلی اطلاعات پایه
    [HasPermission("Inventory.BaseInfo")]
    public async Task<ActionResult<int>> SetItemWarehouseSetting([FromBody] SetItemWarehouseSettingCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPost("profiles")]
    // اصلاح شد: دسترسی کلی اطلاعات پایه
    [HasPermission("Inventory.BaseInfo")]
    public async Task<ActionResult<int>> ConfigureProfile([FromBody] ConfigureInventoryItemProfileCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    // ==========================================
    // 2. عملیات اسناد (Operations)
    // ==========================================

    // ثبت سند پیش‌نویس (Draft)
    [HttpPost("docs")]
    // اصلاح شد: منطبق با Inventory.Docs.Create
    [HasPermission("Inventory.Docs.Create")]
    public async Task<ActionResult<int>> CreateDocument([FromBody] CreateInventoryDocCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id, message = "سند با موفقیت به صورت پیش‌نویس ثبت شد." });
    }

    // تایید سند (Approve)
    [HttpPost("docs/{id}/approve")]
    // اصلاح شد: منطبق با Inventory.Docs.Approve
    [HasPermission("Inventory.Docs.Approve")]
    public async Task<IActionResult> ApproveDocument(long id, [FromBody] ApproveInventoryDocCommand command)
    {
        if (id != command.Id) return BadRequest("شناسه سند در آدرس و بدنه درخواست مغایرت دارد.");
        
        await _mediator.Send(command);
        return Ok(new { message = "سند با موفقیت تایید شد." });
    }

    // قطعی سازی سند (Post)
    [HttpPost("docs/{id}/post")]
    // اصلاح شد: منطبق با Inventory.Docs.Post
    [HasPermission("Inventory.Docs.Post")]
    public async Task<IActionResult> PostDocument(long id, [FromBody] PostInventoryDocCommand command)
    {
        if (id != command.Id) return BadRequest("شناسه سند در آدرس و بدنه درخواست مغایرت دارد.");

        await _mediator.Send(command);
        return Ok(new { message = "سند با موفقیت در کاردکس قطعی شد." });
    }

    // ==========================================
    // 3. گزارشات (Reporting)
    // ==========================================

    [HttpPost("stock/current")] 
    // اصلاح شد: منطبق با Inventory.Reports.CurrentStock
    [HasPermission("Inventory.Reports.CurrentStock")]
    public async Task<ActionResult<PaginatedResult<InventoryStockDto>>> GetCurrentStock([FromBody] GetCurrentStockQuery query)
    {
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpGet("reports/cardex")]
    // اصلاح شد: منطبق با Inventory.Reports.Cardex
    [HasPermission("Inventory.Reports.Cardex")]
    public async Task<ActionResult<PaginatedResult<ProductCardexDto>>> GetProductCardex([FromQuery] GetProductCardexQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    [HttpDelete("docs/{id}")]
    // اصلاح شد: منطبق با Inventory.Docs.Delete
    [HasPermission("Inventory.Docs.Delete")]
    public async Task<IActionResult> DeleteDocument(long id, [FromQuery] string rowVersion)
    {
        rowVersion = rowVersion.Replace(" ", "+"); 
        
        await _mediator.Send(new DeleteInventoryDocCommand(id, rowVersion));
        return NoContent();
    }

    // ویرایش سند (فقط Draft)
    [HttpPut("docs/{id}")]
    // اصلاح شد: منطبق با Inventory.Docs.Edit
    [HasPermission("Inventory.Docs.Edit")]
    public async Task<IActionResult> UpdateDocument(long id, [FromBody] UpdateInventoryDocCommand command)
    {
        if (id != command.Id) return BadRequest("مغایرت شناسه.");
        await _mediator.Send(command);
        return Ok(new { message = "سند با موفقیت ویرایش شد." });
    }

    // بازگشت از تایید (Un-Approve)
    [HttpPost("docs/{id}/revert")]
    // اصلاح شد: منطبق با Inventory.Docs.Revert
    [HasPermission("Inventory.Docs.Revert")]
    public async Task<IActionResult> RevertDocument(long id)
    {
        await _mediator.Send(new RevertInventoryDocCommand(id));
        return Ok(new { message = "سند به وضعیت پیش‌نویس برگشت." });
    }

    [HttpGet("warehouses/{id}")]
    [HasPermission("Inventory.Warehouses.View")]
    public async Task<ActionResult<WarehouseDetailsDto>> GetWarehouse(int id)
    {
        return Ok(await _mediator.Send(new GetWarehouseByIdQuery(id)));
    }

    [HttpDelete("warehouses/{id}")]
    [HasPermission("Inventory.Warehouses.Delete")]
    public async Task<IActionResult> DeleteWarehouse(int id, [FromQuery] string rowVersion)
    {
        var cleanRowVersion = rowVersion.Replace(" ", "+");
        await _mediator.Send(new DeleteWarehouseCommand(id, cleanRowVersion));
        return NoContent();
    }

    [HttpGet("warehouse-types")]
    [HasPermission("Inventory.Warehouses.View")] // یا هر پرمیشنی که برای مشاهده اطلاعات پایه در نظر دارید
    public IActionResult GetWarehouseTypes()
    {
        // استفاده از متد ToList در EnumExtensions برای دریافت لیست مقادیر و عناوین فارسی
        var types = EnumExtensions.ToList<WarehouseType>(); 
        return Ok(types);
    }

    [HttpPut("warehouses/{id}")]
    [HasPermission("Inventory.Warehouses.Edit")]
    public async Task<IActionResult> UpdateWarehouse(int id, [FromBody] UpdateWarehouseCommand command)
    {
        if (id != command.Id) return BadRequest("مغایرت شناسه.");
        await _mediator.Send(command);
        return Ok(new { message = "انبار با موفقیت ویرایش شد." });
    }

// === Locations ===

    [HttpGet("warehouses/{warehouseId}/locations")]
    [HasPermission("Inventory.Warehouses.View")] // دسترسی مشاهده انبار برای دیدن لوکیشن‌ها کافی است
    public async Task<ActionResult<List<LocationDto>>> GetLocations(int warehouseId)
    {
        return Ok(await _mediator.Send(new GetLocationsQuery(warehouseId)));
    }

    [HttpGet("locations/{id}")]
    [HasPermission("Inventory.Warehouses.View")]
    public async Task<ActionResult<LocationDto>> GetLocationById(int id)
    {
        return Ok(await _mediator.Send(new GetLocationByIdQuery(id)));
    }

    [HttpPost("locations")]
    // اصلاح شد: منطبق با Inventory.Locations.Define
    [HasPermission("Inventory.Locations.Define")]
    public async Task<ActionResult<int>> CreateLocation([FromBody] CreateLocationCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPut("locations/{id}")]
    [HasPermission("Inventory.Warehouses.Edit")]
    public async Task<IActionResult> UpdateLocation(int id, [FromBody] UpdateLocationCommand command)
    {
        if (id != command.Id) return BadRequest("مغایرت شناسه.");
        
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("locations/{id}")]
    [HasPermission("Inventory.Warehouses.Delete")]
    public async Task<IActionResult> DeleteLocation(int id, [FromQuery] string rowVersion)
    {
        if (string.IsNullOrEmpty(rowVersion)) return BadRequest("ارسال نسخه ردیف (RowVersion) الزامی است.");
        
        // جایگزینی کاراکتر فاصله با + که در انتقال URL ممکن است تغییر کرده باشد
        var cleanRowVersion = rowVersion.Replace(" ", "+");
        
        await _mediator.Send(new DeleteLocationCommand(id, cleanRowVersion));
        return NoContent();
    }
    
}