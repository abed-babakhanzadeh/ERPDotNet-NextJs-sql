using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Modules.BaseInfo.Commands.CreateFiscalYear;
using ERPDotNet.Application.Modules.BaseInfo.Services;
using ERPDotNet.Domain.Modules.BaseInfo.Entities;
using ERPDotNet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Tests.BaseInfo;

public class FiscalYearServiceTests : IDisposable
{
    private static readonly byte[] RowVersion = [1];
    private readonly AppDbContext _db =
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Without_any_fiscal_year_documents_get_no_year()
    {
        var yearId = await new FiscalYearService(_db).ResolveOpenYearAsync(null, new DateTime(2026, 5, 1), default);
        Assert.Null(yearId);
    }

    [Fact]
    public async Task Date_resolves_to_the_open_year_of_the_same_company()
    {
        var mine = await AddYear(companyId: 1, "1405", new DateTime(2026, 3, 21), new DateTime(2027, 3, 20));
        await AddYear(companyId: 2, "1405-B", new DateTime(2026, 3, 21), new DateTime(2027, 3, 20));

        var yearId = await new FiscalYearService(_db).ResolveOpenYearAsync(1, new DateTime(2027, 3, 20, 14, 0, 0), default);

        Assert.Equal(mine, yearId);
    }

    [Fact]
    public async Task Date_outside_every_year_is_rejected()
    {
        await AddYear(companyId: 1, "1405", new DateTime(2026, 3, 21), new DateTime(2027, 3, 20));

        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            new FiscalYearService(_db).ResolveOpenYearAsync(1, new DateTime(2027, 3, 21), default));
    }

    [Fact]
    public async Task Closed_year_does_not_accept_new_documents()
    {
        await AddYear(companyId: 1, "1404", new DateTime(2025, 3, 21), new DateTime(2026, 3, 20), FiscalYearStatus.Closed);

        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            new FiscalYearService(_db).ResolveOpenYearAsync(1, new DateTime(2025, 6, 1), default));
    }

    [Fact]
    public async Task Without_company_a_closed_year_of_another_company_does_not_block()
    {
        // سال بسته با شروع زودتر، تا ترتیب تاریخ به‌تنهایی آن را انتخاب کند
        await AddYear(companyId: 2, "1405-B", new DateTime(2026, 1, 1), new DateTime(2026, 12, 31), FiscalYearStatus.Closed);
        var open = await AddYear(companyId: 1, "1405", new DateTime(2026, 3, 21), new DateTime(2027, 3, 20));

        Assert.Equal(open, await new FiscalYearService(_db).ResolveOpenYearAsync(null, new DateTime(2026, 5, 1), default));
    }

    [Fact]
    public async Task Overlap_is_detected_within_a_company_only()
    {
        await AddYear(companyId: 1, "1405", new DateTime(2026, 3, 21), new DateTime(2027, 3, 20));

        Assert.Equal("1405", await FiscalYearRules.FindOverlapAsync(_db, 1, new DateTime(2027, 3, 20), new DateTime(2028, 3, 19), null, default));
        Assert.Null(await FiscalYearRules.FindOverlapAsync(_db, 1, new DateTime(2027, 3, 21), new DateTime(2028, 3, 19), null, default));
        Assert.Null(await FiscalYearRules.FindOverlapAsync(_db, 2, new DateTime(2026, 3, 21), new DateTime(2027, 3, 20), null, default));
    }

    private async Task<int> AddYear(int companyId, string title, DateTime start, DateTime end, FiscalYearStatus status = FiscalYearStatus.Open)
    {
        var year = new FiscalYear { CompanyId = companyId, Title = title, StartDate = start, EndDate = end, Status = status, RowVersion = RowVersion };
        _db.FiscalYears.Add(year);
        await _db.SaveChangesAsync();
        return year.Id;
    }
}
