using ERPDotNet.API.Attributes;
using ERPDotNet.Application.Common.Models;
// === اصلاح نیم‌اسپیس‌ها طبق فایل‌های آپلود شده ===
using ERPDotNet.Application.Modules.Inventory.Commands.ApproveInventoryDoc; 
using ERPDotNet.Application.Modules.Inventory.Commands.CreateBatch;
using ERPDotNet.Application.Modules.Inventory.Commands.CreateInventoryDoc;
using ERPDotNet.Application.Modules.Inventory.Commands.CreateLocation;
using ERPDotNet.Application.Modules.Inventory.Commands.DefineDocType;
using ERPDotNet.Application.Modules.Inventory.Commands.DefineWarehouse;
using ERPDotNet.Application.Modules.Inventory.Commands.PostInventoryDoc;
using ERPDotNet.Application.Modules.Inventory.Commands.SetItemWarehouseSetting;
using ERPDotNet.Application.Modules.Inventory.Commands.ConfigureItemProfile;
// ==================================================
using ERPDotNet.Application.Modules.Inventory.DTOs;
using ERPDotNet.Application.Modules.Inventory.Queries.GetCurrentStock;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ERPDotNet.Application.Modules.Inventory.Queries.GetProductCardex;

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
    // [HasPermission("Inventory.Warehouses.Create")] 
    public async Task<ActionResult<int>> DefineWarehouse([FromBody] DefineWarehouseCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPost("doc-types")]
    // [HasPermission("Inventory.DocTypes.Create")]
    public async Task<ActionResult<int>> DefineDocType([FromBody] DefineInventoryDocTypeCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPost("locations")]
    // [HasPermission("Inventory.Locations.Create")]
    public async Task<ActionResult<int>> CreateLocation([FromBody] CreateLocationCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPost("batches")]
    // [HasPermission("Inventory.Batches.Create")]
    public async Task<ActionResult<int>> CreateBatch([FromBody] CreateInventoryBatchCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPost("settings/item")]
    // [HasPermission("Inventory.Settings.Edit")]
    public async Task<ActionResult<int>> SetItemWarehouseSetting([FromBody] SetItemWarehouseSettingCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id });
    }

    [HttpPost("profiles")]
    // [HasPermission("Inventory.Profiles.Edit")]
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
    // [HasPermission("Inventory.Docs.Create")]
    public async Task<ActionResult<int>> CreateDocument([FromBody] CreateInventoryDocCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { id, message = "سند با موفقیت به صورت پیش‌نویس ثبت شد." });
    }

    // تایید سند (Approve)
    [HttpPost("docs/{id}/approve")]
    // [HasPermission("Inventory.Docs.Approve")]
    public async Task<IActionResult> ApproveDocument(long id, [FromBody] ApproveInventoryDocCommand command)
    {
        // چک کردن تطابق شناسه URL با بدنه درخواست
        if (id != command.Id) return BadRequest("شناسه سند در آدرس و بدنه درخواست مغایرت دارد.");
        
        // نکته: در بادی درخواست باید RowVersion هم ارسال شود تا ولیدیشن پاس شود
        await _mediator.Send(command);
        return Ok(new { message = "سند با موفقیت تایید شد." });
    }

    // قطعی سازی سند (Post)
    [HttpPost("docs/{id}/post")]
    // [HasPermission("Inventory.Docs.Post")]
    public async Task<IActionResult> PostDocument(long id, [FromBody] PostInventoryDocCommand command)
    {
        if (id != command.Id) return BadRequest("شناسه سند در آدرس و بدنه درخواست مغایرت دارد.");

        // نکته: RowVersion اجباری است
        await _mediator.Send(command);
        return Ok(new { message = "سند با موفقیت در کاردکس قطعی شد." });
    }

    // ==========================================
    // 3. گزارشات (Reporting)
    // ==========================================

    [HttpPost("stock/current")] 
    // [HasPermission("Inventory.Reports.CurrentStock")]
    public async Task<ActionResult<PaginatedResult<InventoryStockDto>>> GetCurrentStock([FromBody] GetCurrentStockQuery query)
    {
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    // === متد جدید کاردکس ===
    [HttpGet("reports/cardex")]
    // [HasPermission("Inventory.Reports.Cardex")]
    public async Task<ActionResult<PaginatedResult<ProductCardexDto>>> GetProductCardex([FromQuery] GetProductCardexQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

}