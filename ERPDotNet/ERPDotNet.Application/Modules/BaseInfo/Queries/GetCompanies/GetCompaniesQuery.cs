using System.Linq.Expressions;
using ERPDotNet.Application.Common.Extensions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Common.Models;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.BaseInfo.Queries.GetCompanies;

public record CompanyDto(
    int Id,
    string Code,
    string Title,
    string? NationalId,
    string? EconomicCode,
    string? RegistrationNumber,
    string? Phone,
    string? Address,
    bool IsActive,
    byte[] RowVersion
);

public record GetCompaniesQuery : PaginatedRequest, IRequest<PaginatedResult<CompanyDto>>;

public record GetCompaniesLookupQuery : IRequest<List<CompanyDto>>;

public record GetCompanyByIdQuery(int Id) : IRequest<CompanyDto?>;

public class GetCompaniesHandler :
    IRequestHandler<GetCompaniesQuery, PaginatedResult<CompanyDto>>,
    IRequestHandler<GetCompaniesLookupQuery, List<CompanyDto>>,
    IRequestHandler<GetCompanyByIdQuery, CompanyDto?>
{
    private readonly IApplicationDbContext _context;

    public GetCompaniesHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<CompanyDto>> Handle(GetCompaniesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Companies.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            query = query.Where(x => x.Title.Contains(request.SearchTerm) || x.Code.Contains(request.SearchTerm));

        query = query.ApplyDynamicFilters(request.Filters);
        query = string.IsNullOrEmpty(request.SortColumn)
            ? query.OrderByNatural("Code", false)
            : query.OrderByNatural(request.SortColumn, request.SortDescending);

        return await query.Select(ToDto).ToPaginatedListAsync(request.PageNumber, request.PageSize, cancellationToken);
    }

    public async Task<List<CompanyDto>> Handle(GetCompaniesLookupQuery request, CancellationToken cancellationToken)
    {
        return await _context.Companies
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Code)
            .Select(ToDto)
            .ToListAsync(cancellationToken);
    }

    public async Task<CompanyDto?> Handle(GetCompanyByIdQuery request, CancellationToken cancellationToken)
    {
        return await _context.Companies
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
            .Select(ToDto)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static readonly Expression<Func<Company, CompanyDto>> ToDto =
        x => new CompanyDto(
            x.Id, x.Code, x.Title, x.NationalId, x.EconomicCode, x.RegistrationNumber,
            x.Phone, x.Address, x.IsActive, x.RowVersion ?? new byte[0]);
}
