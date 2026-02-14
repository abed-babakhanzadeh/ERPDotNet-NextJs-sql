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
using ERPDotNet.Application.Modules.Inventory.Queries.GetInventoryDocTypes;
using ERPDotNet.Application.Modules.Inventory.Queries.GetInventoryDocTypeById;
using ERPDotNet.Application.Modules.Inventory.Commands.UpdateInventoryDocType;
using ERPDotNet.Application.Modules.Inventory.Commands.DeleteInventoryDocType;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using ERPDotNet.Application.Modules.Inventory.Queries.GetItemProfile;
using ERPDotNet.Application.Modules.Inventory.Queries.GetBatches;
using ERPDotNet.Application.Modules.Inventory.Commands.UpdateBatch;

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

    // === Doc Types (انواع سند) ===

    [HttpGet("doc-types")]
    [HasPermission("Inventory.DocTypes.View")]
    public async Task<ActionResult<List<InventoryDocTypeDto>>> GetDocTypes()
    {
        return Ok(await _mediator.Send(new GetInventoryDocTypesQuery()));
    }

    [HttpGet("doc-types/{id}")]
    [HasPermission("Inventory.DocTypes.View")]
    public async Task<ActionResult<InventoryDocTypeDto>> GetDocTypeById(int id)
    {
        return Ok(await _mediator.Send(new GetInventoryDocTypeByIdQuery(id)));
    }

    [HttpPost("doc-types")]
    [HasPermission("Inventory.DocTypes.Create")]
    public async Task<ActionResult<int>> DefineDocType([FromBody] DefineInventoryDocTypeCommand command)
    {
        return Ok(await _mediator.Send(command));
    }

    [HttpPut("doc-types/{id}")]
    [HasPermission("Inventory.DocTypes.Edit")]
    public async Task<IActionResult> UpdateDocType(int id, [FromBody] UpdateInventoryDocTypeCommand command)
    {
        if (id != command.Id) return BadRequest("مغایرت شناسه.");
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("doc-types/{id}")]
    [HasPermission("Inventory.DocTypes.Delete")]
    public async Task<IActionResult> DeleteDocType(int id, [FromQuery] string rowVersion)
    {
        if (string.IsNullOrEmpty(rowVersion)) return BadRequest("RowVersion الزامی است.");
        var cleanRowVersion = rowVersion.Replace(" ", "+");
        
        await _mediator.Send(new DeleteInventoryDocTypeCommand(id, cleanRowVersion));
        return NoContent();
    }

    // === Helper Enums for Frontend ===
    
    [HttpGet("enums/numbering-scopes")]
    public IActionResult GetNumberingScopes()
    {
        // فرض بر این است که اکستنشن متد ToList شما لیست Key/Value برمی‌گرداند
        return Ok(EnumExtensions.ToList<NumberingScope>());
    }

    [HttpGet("enums/inventory-natures")]
    public IActionResult GetInventoryNatures()
    {
        return Ok(EnumExtensions.ToList<InventoryNature>());
    }

    [HttpGet("enums/system-entities")]
    public IActionResult GetSystemEntities()
    {
        // این لیست باید بازتاب‌دهنده موجودیت‌هایی باشد که سیستم شما ساپورت می‌کند.
        // در یک سیستم پیشرفته، این می‌تواند از طریق Reflection یا یک سرویس Metadata پر شود.
        // فعلاً به صورت دستی اما سمت سرور لیست می‌کنیم تا فرانت داینامیک شود.
        var entities = new List<object>
        {
            new { Value = "Project", Label = "پروژه" },
            new { Value = "CostCenter", Label = "مرکز هزینه" },
            new { Value = "Vendor", Label = "تأمین‌کننده" },
            new { Value = "Customer", Label = "مشتری" },
            new { Value = "Personnel", Label = "پرسنل" },
            new { Value = "WorkOrder", Label = "دستور کار تولید" },
            new { Value = "SalesOrder", Label = "سفارش فروش" },
            new { Value = "ReturnRequest", Label = "درخواست مرجوعی" }
        };
        
        return Ok(entities);
    }

    // === Product Inventory Profile (تنظیمات انبار کالا) ===

    [HttpGet("products/{productId}/profile")]
    [HasPermission("Inventory.ProductProfiles.View")] // یا پرمیشن مشاهده کالا
    public async Task<ActionResult<InventoryItemProfileDto?>> GetProductInventoryProfile(int productId)
    {
        var result = await _mediator.Send(new GetInventoryItemProfileQuery(productId));
        // اگر نال بود یعنی هنوز تنظیم نشده، فرانت می‌تواند فرم خالی نشان دهد یا هندل کند
        return Ok(result);
    }

    [HttpPost("products/profile")]
    [HasPermission("Inventory.ProductProfiles.Edit")]
    public async Task<ActionResult<int>> ConfigureProductProfile([FromBody] ConfigureInventoryItemProfileCommand command)
    {
        return Ok(await _mediator.Send(command));
    }

    [HttpPost("products/warehouse-settings")]
    [HasPermission("Inventory.ProductProfiles.Edit")]
    public async Task<ActionResult<int>> SetProductWarehouseSetting([FromBody] SetItemWarehouseSettingCommand command)
    {
        return Ok(await _mediator.Send(command));
    }

    // === Batch Management ===

    [HttpGet("products/{productId}/batches")]
    [HasPermission("Inventory.ProductProfiles.View")]
    public async Task<ActionResult<List<InventoryBatchDto>>> GetProductBatches(int productId, [FromQuery] bool includeBlocked = false)
    {
        return Ok(await _mediator.Send(new GetInventoryBatchesQuery(productId, includeBlocked)));
    }

    [HttpPut("batches/{id}")]
    [HasPermission("Inventory.ProductProfiles.Edit")]
    public async Task<IActionResult> UpdateBatch(int id, [FromBody] UpdateInventoryBatchCommand command)
    {
        if (id != command.Id) return BadRequest("مغایرت شناسه.");
        await _mediator.Send(command);
        return NoContent();
    }

    // متد Create که قبلاً داشتید (فقط جهت یادآوری که باید باشد)
    [HttpPost("batches")]
    [HasPermission("Inventory.ProductProfiles.Edit")]
    public async Task<ActionResult<int>> CreateBatch([FromBody] CreateInventoryBatchCommand command)
    {
        return Ok(await _mediator.Send(command));
    }

    // === Warehouse Settings Delete ===
    
    [HttpDelete("products/warehouse-settings/{id}")]
    [HasPermission("Inventory.ProductProfiles.Edit")]
    public async Task<IActionResult> DeleteWarehouseSetting(int id, [FromQuery] string rowVersion)
    {
        if (string.IsNullOrEmpty(rowVersion)) return BadRequest("RowVersion الزامی است.");
        
        var cleanRowVersion = rowVersion.Replace(" ", "+");
        await _mediator.Send(new DeleteItemWarehouseSettingCommand(id, cleanRowVersion));
        
        return NoContent();
    }

}