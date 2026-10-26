using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Production.Queries.GetWorkCenters;

public record WorkCenterDto(
    int Id,
    string Code,
    string Title,
    int? CostCenterId,
    string? CostCenterTitle,
    decimal HoursPerDay,
    decimal HourlyRate,
    bool IsActive,
    string? Description,
    byte[] RowVersion
);

/// <summary>گزینه مرکز کاری برای فرم مسیر تولید</summary>
public record WorkCenterOptionDto(int Id, string Code, string Title, bool IsActive);

public record GetWorkCentersQuery : PaginatedRequest, IRequest<PaginatedResult<WorkCenterDto>>;

public record GetWorkCenterOptionsQuery : IRequest<List<WorkCenterOptionDto>>;

public record GetWorkCenterByIdQuery(int Id) : IRequest<WorkCenterDto?>;

public class GetWorkCentersHandler :
    IRequestHandler<GetWorkCentersQuery, PaginatedResult<WorkCenterDto>>,
    IRequestHandler<GetWorkCenterOptionsQuery, List<WorkCenterOptionDto>>,
    IRequestHandler<GetWorkCenterByIdQuery, WorkCenterDto?>
{
    private static readonly Dictionary<string, string> Columns = new(StringComparer.OrdinalIgnoreCase)
    {
        ["code"] = "Code",
        ["title"] = "Title",
        ["costCenterTitle"] = "CostCenter.Title",
        ["hoursPerDay"] = "HoursPerDay",
        ["hourlyRate"] = "HourlyRate",
        ["isActive"] = "IsActive",
        ["description"] = "Description",
    };

    private readonly IApplicationDbContext _context;

    public GetWorkCentersHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<WorkCenterDto>> Handle(GetWorkCentersQuery request, CancellationToken cancellationToken)
    {
        var query = _context.WorkCenters.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim();
            query = query.Where(w => w.Code.Contains(term) || w.Title.Contains(term));
        }

        if (request.Filters != null)
            foreach (var f in request.Filters)
                if (Columns.TryGetValue(f.PropertyName, out var mapped)) f.PropertyName = mapped;
        query = query.ApplyDynamicFilters(request.Filters);

        query = !string.IsNullOrEmpty(request.SortColumn) && Columns.TryGetValue(request.SortColumn, out var sort)
            ? query.OrderByNatural(sort, request.SortDescending)
            : query.OrderBy(w => w.Code);

        return await Project(query).ToPaginatedListAsync(request.PageNumber, request.PageSize, cancellationToken);
    }

    public Task<WorkCenterDto?> Handle(GetWorkCenterByIdQuery request, CancellationToken cancellationToken) =>
        Project(_context.WorkCenters.AsNoTracking().Where(w => w.Id == request.Id)).FirstOrDefaultAsync(cancellationToken);

    private static IQueryable<WorkCenterDto> Project(IQueryable<ERPDotNet.Domain.Modules.Production.Entities.WorkCenter> query) =>
        query.Select(w => new WorkCenterDto(w.Id, w.Code, w.Title, w.CostCenterId,
            w.CostCenter != null ? w.CostCenter.Title : null, w.HoursPerDay, w.HourlyRate, w.IsActive, w.Description, w.RowVersion ?? new byte[0]));

    // غیرفعال‌ها هم برمی‌گردند تا فرمولی که از قبل به آن‌ها ارجاع دارد درست نمایش داده شود
    public Task<List<WorkCenterOptionDto>> Handle(GetWorkCenterOptionsQuery request, CancellationToken cancellationToken) =>
        _context.WorkCenters.AsNoTracking()
            .OrderByDescending(w => w.IsActive).ThenBy(w => w.Code)
            .Select(w => new WorkCenterOptionDto(w.Id, w.Code, w.Title, w.IsActive))
            .ToListAsync(cancellationToken);
}
