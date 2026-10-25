using System.Linq.Expressions;
using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Queries.GetFiscalYears;

public record FiscalYearDto(
    int Id,
    int CompanyId,
    string CompanyTitle,
    string Title,
    DateTime StartDate,
    DateTime EndDate,
    FiscalYearStatus Status,
    byte[] RowVersion
);

public record GetFiscalYearsQuery : PaginatedRequest, IRequest<PaginatedResult<FiscalYearDto>>;

public record GetFiscalYearsLookupQuery(int? CompanyId = null) : IRequest<List<FiscalYearDto>>;

public record GetFiscalYearByIdQuery(int Id) : IRequest<FiscalYearDto?>;

public class GetFiscalYearsHandler :
    IRequestHandler<GetFiscalYearsQuery, PaginatedResult<FiscalYearDto>>,
    IRequestHandler<GetFiscalYearsLookupQuery, List<FiscalYearDto>>,
    IRequestHandler<GetFiscalYearByIdQuery, FiscalYearDto?>
{
    private readonly IApplicationDbContext _context;

    public GetFiscalYearsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<FiscalYearDto>> Handle(GetFiscalYearsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.FiscalYears.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            query = query.Where(x => x.Title.Contains(request.SearchTerm) || x.Company!.Title.Contains(request.SearchTerm));

        if (request.Filters != null)
        {
            foreach (var f in request.Filters.Where(f => f.PropertyName.Equals("CompanyTitle", StringComparison.OrdinalIgnoreCase)))
                f.PropertyName = "Company.Title";
        }
        query = query.ApplyDynamicFilters(request.Filters);

        var sortColumn = string.Equals(request.SortColumn, "CompanyTitle", StringComparison.OrdinalIgnoreCase)
            ? "Company.Title"
            : request.SortColumn;
        // پیش‌فرض: جدیدترین سال بالا
        query = string.IsNullOrEmpty(sortColumn)
            ? query.OrderByDescending(x => x.StartDate)
            : query.OrderByNatural(sortColumn, request.SortDescending);

        return await query.Select(ToDto).ToPaginatedListAsync(request.PageNumber, request.PageSize, cancellationToken);
    }

    public async Task<List<FiscalYearDto>> Handle(GetFiscalYearsLookupQuery request, CancellationToken cancellationToken)
    {
        var query = _context.FiscalYears.AsNoTracking();
        if (request.CompanyId.HasValue)
            query = query.Where(x => x.CompanyId == request.CompanyId.Value);

        return await query.OrderByDescending(x => x.StartDate).Select(ToDto).ToListAsync(cancellationToken);
    }

    public async Task<FiscalYearDto?> Handle(GetFiscalYearByIdQuery request, CancellationToken cancellationToken)
    {
        return await _context.FiscalYears
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
            .Select(ToDto)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static readonly Expression<Func<FiscalYear, FiscalYearDto>> ToDto =
        x => new FiscalYearDto(
            x.Id, x.CompanyId, x.Company != null ? x.Company.Title : "", x.Title,
            x.StartDate, x.EndDate, x.Status, x.RowVersion ?? new byte[0]);
}
