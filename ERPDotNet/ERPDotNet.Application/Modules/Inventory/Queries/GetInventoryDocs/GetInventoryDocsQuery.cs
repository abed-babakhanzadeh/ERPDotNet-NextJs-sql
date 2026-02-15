using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.Inventory.DTOs;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace ERPDotNet.Application.Modules.Inventory.Queries.GetInventoryDocs;

public class GetInventoryDocsQuery : IRequest<PaginatedResult<InventoryDocDto>>
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    
    // نکته مهم: در هوک فرانت نام پارامتر sortColumn است
    public string SortColumn { get; set; } = "Id"; 
    
    // نکته مهم: در هوک فرانت نام پارامتر sortDescending است
    public bool SortDescending { get; set; } = true;

    // ✅ اصلاح حیاتی: تغییر نام از AdvancedFilters به Filters برای تطابق با هوک useServerDataTable
    public List<FilterModel>? Filters { get; set; }
    
    public string? SearchTerm { get; set; } 
}

public class GetInventoryDocsHandler : IRequestHandler<GetInventoryDocsQuery, PaginatedResult<InventoryDocDto>>
{
    private readonly IApplicationDbContext _context;

    public GetInventoryDocsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<InventoryDocDto>> Handle(GetInventoryDocsQuery request, CancellationToken cancellationToken)
    {
        // 1. کوئری پایه روی Entity
        var query = _context.InventoryDocHeaders
            .AsNoTracking()
            .Include(x => x.DocType)
            .Include(x => x.Warehouse)
            .AsQueryable();

        // 2. جستجوی کلی (SearchBox)
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim();
            bool isNumber = long.TryParse(term, out long docNum);

            query = query.Where(x => 
                (isNumber && x.DocNumber == docNum) ||
                (x.TargetPartyName != null && x.TargetPartyName.Contains(term)) ||
                (x.Description != null && x.Description.Contains(term)) ||
                (x.ReferenceExternalCode != null && x.ReferenceExternalCode.Contains(term))
            );
        }

        // 3. اعمال فیلترهای ستونی (دستی + داینامیک)
        if (request.Filters != null && request.Filters.Any())
        {
            // الف) جدا کردن فیلترهای خاص (شماره سند و تاریخ)
            // نام پراپرتی‌ها از فرانت camelCase می‌آید
            var docNumberFilters = request.Filters
                .Where(f => f.PropertyName.Equals("docNumber", StringComparison.OrdinalIgnoreCase))
                .ToList();

            var dateFilters = request.Filters
                .Where(f => f.PropertyName.Equals("docDate", StringComparison.OrdinalIgnoreCase))
                .ToList();

            // ب) لیست فیلترهای استاندارد (حذف خاص‌ها از لیست اصلی)
            var standardFilters = request.Filters
                .Except(docNumberFilters)
                .Except(dateFilters)
                .ToList();

            // --- هندل کردن فیلتر شماره سند (تبدیل به String برای Contains) ---
            foreach (var filter in docNumberFilters)
            {
                if (!string.IsNullOrEmpty(filter.Value))
                {
                    query = query.Where(x => x.DocNumber.ToString().Contains(filter.Value));
                }
            }

            // --- هندل کردن فیلتر تاریخ (شمسی به میلادی) ---
            foreach (var filter in dateFilters)
            {
                if (!string.IsNullOrWhiteSpace(filter.Value))
                {
                    var gregorianDate = ConvertPersianToGregorian(filter.Value);
                    if (gregorianDate.HasValue)
                    {
                        // مقایسه Date (بدون ساعت)
                        query = query.Where(x => x.DocDate.Date == gregorianDate.Value.Date);
                    }
                }
            }

            // --- هندل کردن بقیه فیلترها ---
            if (standardFilters.Any())
            {
                // مپ کردن نام ستون‌های فرانت به دیتابیس
                foreach (var filter in standardFilters)
                {
                    filter.PropertyName = MapColumn(filter.PropertyName);
                }
                query = query.ApplyDynamicFilters(standardFilters);
            }
        }

        // 4. اعمال سورت
        var sortColumn = MapColumn(request.SortColumn); // نگاشت نام ستون سورت
        
        if (!string.IsNullOrEmpty(sortColumn))
        {
            query = query.OrderByNatural(sortColumn, request.SortDescending);
        }
        else
        {
            query = query.OrderByDescending(x => x.Id);
        }

        // 5. دریافت دیتا
        var totalCount = await query.CountAsync(cancellationToken);
        
        var items = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(x => new InventoryDocDto
            {
                Id = x.Id,
                DocNumber = x.DocNumber,
                DocDate = x.DocDate,
                DocTypeId = x.DocTypeId,
                DocTypeTitle = x.DocType != null ? x.DocType.Title : "",
                Nature = x.DocType != null ? x.DocType.Nature : InventoryNature.Input,
                WarehouseId = x.WarehouseId,
                WarehouseTitle = x.Warehouse != null ? x.Warehouse.Title : "",
                DestinationWarehouseId = x.DestinationWarehouseId,
                DestinationWarehouseTitle = x.DestinationWarehouse != null ? x.DestinationWarehouse.Title : null,
                Status = x.Status,
                TargetPartyName = x.TargetPartyName,
                ReferenceExternalCode = x.ReferenceExternalCode,
                Description = x.Description ?? "",
                RowVersion = x.RowVersion != null ? Convert.ToBase64String(x.RowVersion) : ""
            })
            .ToListAsync(cancellationToken);

        return new PaginatedResult<InventoryDocDto>(items, totalCount, request.PageNumber, request.PageSize);
    }

    private string MapColumn(string column) => column?.ToLower() switch
    {
        "id" => "Id",
        "doctypetitle" => "DocType.Title",
        "warehousetitle" => "Warehouse.Title",
        "targetpartyname" => "TargetPartyName",
        "description" => "Description",
        "nature" => "DocType.Nature",
        "status" => "Status",
        _ => column // پیش‌فرض خود نام را برگردان
    };

    private DateTime? ConvertPersianToGregorian(string persianDate)
    {
        try
        {
            // فرمت ورودی احتمالی: 1402/05/20
            var parts = persianDate.Split('/');
            if (parts.Length != 3) return null;

            int y = int.Parse(parts[0]);
            int m = int.Parse(parts[1]);
            int d = int.Parse(parts[2]);

            var pc = new PersianCalendar();
            return pc.ToDateTime(y, m, d, 0, 0, 0, 0);
        }
        catch
        {
            return null;
        }
    }
}