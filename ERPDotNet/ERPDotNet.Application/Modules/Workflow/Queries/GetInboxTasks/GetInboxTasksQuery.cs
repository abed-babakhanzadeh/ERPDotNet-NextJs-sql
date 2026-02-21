using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Application.Modules.Workflow.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Workflow.Queries.GetInboxTasks;

public class GetInboxTasksQuery : IRequest<PaginatedResult<InboxTaskDto>>
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string SortColumn { get; set; } = "CreatedAt"; 
    public bool SortDescending { get; set; } = true;
    public List<FilterModel>? Filters { get; set; }
    public string? SearchTerm { get; set; }
    
    // فیلتر اختصاصی برای زمانی که کاربر می‌خواهد فقط کارتابل مرخصی‌ها یا انبار را ببیند
    public string? ProcessCode { get; set; } 
}

public class GetInboxTasksHandler : IRequestHandler<GetInboxTasksQuery, PaginatedResult<InboxTaskDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetInboxTasksHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<PaginatedResult<InboxTaskDto>> Handle(GetInboxTasksQuery request, CancellationToken cancellationToken)
    {
        int companyId = int.TryParse(_currentUser.CompanyId, out var cid) ? cid : 
                        throw new UnauthorizedAccessException("شناسه شرکت نامشخص است.");

        // 1. کوئری پایه: فقط تسک‌های باز مربوط به شرکت فعلی
        // نکته: اگر بعداً AssignedToUserId به BpmsTask اضافه کردید، اینجا فیلتر کنید
        var query = _context.BpmsTasks
            .AsNoTracking()
            .Where(t => t.CompanyId == companyId && !t.IsCompleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.ProcessCode))
        {
            query = query.Where(t => t.Instance.ProcessVersion.Process.ProcessCode == request.ProcessCode);
        }

        // 2. Projection: تبدیل زودهنگام به DTO برای بهینه‌سازی SQL و امکان استفاده از فیلترهای داینامیک شما
        var projectedQuery = query.Select(t => new InboxTaskDto
        {
            TaskId = t.Id,
            InstanceId = t.InstanceId,
            ProcessCode = t.Instance.ProcessVersion.Process.ProcessCode,
            ProcessTitle = t.Instance.ProcessVersion.Process.Title,
            TaskTitle = t.Title,
            StateTitle = t.Instance.CurrentState.Title,
            TargetRecordId = t.Instance.TargetRecordId,
            CreatedAt = t.CreatedAt
        });

        // 3. جستجوی کلی (SearchBox)
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim();
            bool isNumber = long.TryParse(term, out long recordId);

            projectedQuery = projectedQuery.Where(x => 
                (isNumber && x.TargetRecordId == recordId) ||
                x.ProcessTitle.Contains(term) ||
                x.TaskTitle.Contains(term) ||
                x.StateTitle.Contains(term)
            );
        }

        // 4. اعمال فیلترهای ستونی داینامیک (اکستنشن خودتان)
        if (request.Filters != null && request.Filters.Any())
        {
            // مپ کردن ستون‌ها (اگر نیاز به تغییر نام از کمل‌کیس فرانت به پاسکال‌کیس بک‌اند بود)
            foreach (var filter in request.Filters)
            {
                filter.PropertyName = MapColumn(filter.PropertyName);
            }
            
            projectedQuery = projectedQuery.ApplyDynamicFilters(request.Filters);
        }

        // 5. اعمال سورت داینامیک (اکستنشن خودتان)
        var sortColumn = MapColumn(request.SortColumn);
        if (!string.IsNullOrEmpty(sortColumn))
        {
            projectedQuery = projectedQuery.OrderByNatural(sortColumn, request.SortDescending);
        }

        // 6. دریافت دیتا و صفحه‌بندی
        var totalCount = await projectedQuery.CountAsync(cancellationToken);
        
        var items = await projectedQuery
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PaginatedResult<InboxTaskDto>(items, totalCount, request.PageNumber, request.PageSize);
    }

    private string MapColumn(string? column) => column?.ToLower() switch
    {
        "taskid" => "TaskId",
        "processcode" => "ProcessCode",
        "processtitle" => "ProcessTitle",
        "tasktitle" => "TaskTitle",
        "statetitle" => "StateTitle",
        "targetrecordid" => "TargetRecordId",
        "createdat" => "CreatedAt",
        _ => column ?? string.Empty 
    };
}