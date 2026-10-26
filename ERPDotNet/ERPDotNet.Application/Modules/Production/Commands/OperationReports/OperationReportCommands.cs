using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Production.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Production.Commands.OperationReports;

/// <summary>گزارش کارکرد یک عملیات سفارش: مقدار سالم و ضایعات، زمان آماده‌سازی و اجرا (دقیقه)</summary>
public record ReportOperationCommand : IRequest<int>
{
    public int OrderId { get; set; }
    public int OperationId { get; set; }
    public DateTime ReportDate { get; set; } = DateTime.UtcNow;
    public decimal GoodQuantity { get; set; }
    public decimal ScrapQuantity { get; set; }
    public decimal SetupMinutes { get; set; }
    public decimal RunMinutes { get; set; }
    public string? Note { get; set; }
}

public record DeleteOperationReportCommand(int OrderId, int ReportId) : IRequest<bool>;

public class ReportOperationValidator : AbstractValidator<ReportOperationCommand>
{
    public ReportOperationValidator()
    {
        RuleFor(x => x.GoodQuantity).GreaterThanOrEqualTo(0).WithMessage("مقدار سالم نمی‌تواند منفی باشد.");
        RuleFor(x => x.ScrapQuantity).GreaterThanOrEqualTo(0).WithMessage("مقدار ضایعات نمی‌تواند منفی باشد.");
        RuleFor(x => x.SetupMinutes).GreaterThanOrEqualTo(0).WithMessage("زمان آماده‌سازی نمی‌تواند منفی باشد.");
        RuleFor(x => x.RunMinutes).GreaterThanOrEqualTo(0).WithMessage("زمان اجرا نمی‌تواند منفی باشد.");
        RuleFor(x => x).Must(x => x.GoodQuantity + x.ScrapQuantity + x.SetupMinutes + x.RunMinutes > 0)
            .WithMessage("مقدار یا زمانی برای گزارش کارکرد وارد نشده است.");
        // انتخابگر تاریخ فقط روز را می‌فرستد؛ یک روز حاشیه برای اختلاف منطقه زمانی
        RuleFor(x => x.ReportDate).LessThanOrEqualTo(_ => DateTime.UtcNow.AddDays(1))
            .WithMessage("تاریخ گزارش کارکرد نمی‌تواند در آینده باشد.");
        RuleFor(x => x.Note).MaximumLength(500);
    }
}

public class OperationReportCommandsHandler :
    IRequestHandler<ReportOperationCommand, int>,
    IRequestHandler<DeleteOperationReportCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public OperationReportCommandsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(ReportOperationCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.ProductionOrders.FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException("سفارش تولید یافت نشد.");
        if (order.Status is not (ProductionOrderStatus.Released or ProductionOrderStatus.InProgress))
            throw new BusinessRuleException(order.Status == ProductionOrderStatus.Draft
                ? "سفارش تولید هنوز تأیید نشده است؛ کارکرد فقط برای سفارش تأییدشده ثبت می‌شود."
                : "برای سفارش تکمیل‌شده یا ابطال‌شده کارکرد ثبت نمی‌شود.");

        var operation = await _context.ProductionOrderOperations.AsNoTracking()
            .Where(o => o.Id == request.OperationId && o.ProductionOrderId == order.Id)
            .Select(o => new { o.WorkCenterId })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new BusinessRuleException("عملیات انتخاب‌شده متعلق به این سفارش تولید نیست.");
        // مرکز کاری حذف نرم‌شده هم نرخش را نگه می‌دارد
        var hourlyRate = await _context.WorkCenters.IgnoreQueryFilters().AsNoTracking()
            .Where(w => w.Id == operation.WorkCenterId).Select(w => w.HourlyRate).FirstOrDefaultAsync(cancellationToken);

        var report = new ProductionOperationReport
        {
            ProductionOrderOperationId = request.OperationId,
            ReportDate = request.ReportDate,
            GoodQuantity = request.GoodQuantity,
            ScrapQuantity = request.ScrapQuantity,
            SetupMinutes = request.SetupMinutes,
            RunMinutes = request.RunMinutes,
            HourlyRate = hourlyRate,
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim()
        };
        _context.ProductionOperationReports.Add(report);
        order.Status = ProductionOrderStatus.InProgress;
        await _context.SaveChangesAsync(cancellationToken);
        return report.Id;
    }

    // حذف نرم؛ گزارش اشتباه حذف و دوباره ثبت می‌شود و سابقه در ممیزی می‌ماند
    public async Task<bool> Handle(DeleteOperationReportCommand request, CancellationToken cancellationToken)
    {
        var report = await _context.ProductionOperationReports
            .Include(r => r.Operation!).ThenInclude(o => o.ProductionOrder)
            .FirstOrDefaultAsync(r => r.Id == request.ReportId && r.Operation!.ProductionOrderId == request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException("گزارش کارکرد یافت نشد.");
        if (report.Operation!.ProductionOrder!.Status is ProductionOrderStatus.Completed or ProductionOrderStatus.Cancelled)
            throw new BusinessRuleException("گزارش کارکرد سفارش تکمیل‌شده یا ابطال‌شده قابل حذف نیست.");

        report.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
