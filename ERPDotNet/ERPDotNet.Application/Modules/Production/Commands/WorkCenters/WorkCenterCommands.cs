using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Production.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Production.Commands.WorkCenters;

/// <summary>فیلدهای مشترک ثبت و ویرایش مرکز کاری</summary>
public interface IWorkCenterInput
{
    int Id { get; }
    string Code { get; }
    string Title { get; }
    int? CostCenterId { get; }
    decimal HoursPerDay { get; }
    decimal HourlyRate { get; }
    string? Description { get; }
}

public record CreateWorkCenterCommand : IRequest<int>, IWorkCenterInput
{
    int IWorkCenterInput.Id => 0;
    public required string Code { get; set; }
    public required string Title { get; set; }
    public int? CostCenterId { get; set; }
    public decimal HoursPerDay { get; set; } = 8;
    public decimal HourlyRate { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Description { get; set; }
}

public record UpdateWorkCenterCommand : IRequest<bool>, IWorkCenterInput
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public required string Title { get; set; }
    public int? CostCenterId { get; set; }
    public decimal HoursPerDay { get; set; }
    public decimal HourlyRate { get; set; }
    public bool IsActive { get; set; }
    public string? Description { get; set; }
    public byte[]? RowVersion { get; set; }
}

public record DeleteWorkCenterCommand(int Id) : IRequest<bool>;

/// <summary>قواعد مشترک ثبت و ویرایش مرکز کاری</summary>
public abstract class WorkCenterInputValidator<T> : AbstractValidator<T> where T : IWorkCenterInput
{
    protected WorkCenterInputValidator(IApplicationDbContext context)
    {
        RuleFor(x => x.Code).NotEmpty().WithMessage("کد مرکز کاری را وارد کنید.")
            .MaximumLength(20).WithMessage("کد مرکز کاری حداکثر ۲۰ کاراکتر است.")
            .MustAsync(async (x, code, ct) => !await context.WorkCenters.AnyAsync(w => w.Code == code.Trim() && w.Id != x.Id, ct))
            .WithMessage("کد مرکز کاری تکراری است.");
        RuleFor(x => x.Title).NotEmpty().WithMessage("عنوان مرکز کاری را وارد کنید.")
            .MaximumLength(100).WithMessage("عنوان مرکز کاری حداکثر ۱۰۰ کاراکتر است.");
        RuleFor(x => x.HoursPerDay).GreaterThan(0).LessThanOrEqualTo(24)
            .WithMessage("ساعت کاری روزانه باید بیشتر از صفر و حداکثر ۲۴ باشد.");
        RuleFor(x => x.HourlyRate).GreaterThanOrEqualTo(0).WithMessage("نرخ ساعتی نمی‌تواند منفی باشد.");
        RuleFor(x => x.CostCenterId)
            .MustAsync(async (id, ct) => await context.CostCenters.AnyAsync(c => c.Id == id && c.IsActive, ct))
            .When(x => x.CostCenterId.HasValue)
            .WithMessage("مرکز هزینه انتخاب‌شده وجود ندارد یا غیرفعال است.");
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public class CreateWorkCenterValidator(IApplicationDbContext context) : WorkCenterInputValidator<CreateWorkCenterCommand>(context);

public class UpdateWorkCenterValidator : WorkCenterInputValidator<UpdateWorkCenterCommand>
{
    public UpdateWorkCenterValidator(IApplicationDbContext context) : base(context)
    {
        RuleFor(x => x.Id).GreaterThan(0);
    }
}

public class WorkCenterCommandsHandler :
    IRequestHandler<CreateWorkCenterCommand, int>,
    IRequestHandler<UpdateWorkCenterCommand, bool>,
    IRequestHandler<DeleteWorkCenterCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public WorkCenterCommandsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CreateWorkCenterCommand request, CancellationToken cancellationToken)
    {
        var entity = new WorkCenter
        {
            Code = request.Code.Trim(),
            Title = request.Title.Trim(),
            CostCenterId = request.CostCenterId,
            HoursPerDay = request.HoursPerDay,
            HourlyRate = request.HourlyRate,
            IsActive = request.IsActive,
            Description = Clean(request.Description)
        };
        _context.WorkCenters.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }

    public async Task<bool> Handle(UpdateWorkCenterCommand request, CancellationToken cancellationToken)
    {
        var entity = await Load(request.Id, cancellationToken);
        if (request.RowVersion is { Length: > 0 })
            _context.Entry(entity).Property(x => x.RowVersion).OriginalValue = request.RowVersion;

        entity.Code = request.Code.Trim();
        entity.Title = request.Title.Trim();
        entity.CostCenterId = request.CostCenterId;
        entity.HoursPerDay = request.HoursPerDay;
        entity.HourlyRate = request.HourlyRate;
        entity.IsActive = request.IsActive;
        entity.Description = Clean(request.Description);

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw ConflictException.Concurrency();
        }
        return true;
    }

    public async Task<bool> Handle(DeleteWorkCenterCommand request, CancellationToken cancellationToken)
    {
        var entity = await Load(request.Id, cancellationToken);
        // مسیر تولید فرمول‌ها به مرکز کاری ارجاع دارد؛ به‌جای حذف می‌شود غیرفعالش کرد
        if (await _context.BOMOperations.AnyAsync(o => o.WorkCenterId == request.Id, cancellationToken))
            throw new BusinessRuleException("این مرکز کاری در مسیر تولید فرمول‌ها استفاده شده و قابل حذف نیست؛ می‌توانید آن را غیرفعال کنید.");
        // عملیات سفارش‌ها هم به آن ارجاع دارند و کارکرد و بهایشان باید نام مرکز را نگه دارد
        if (await _context.ProductionOrderOperations.AnyAsync(o => o.WorkCenterId == request.Id, cancellationToken))
            throw new BusinessRuleException("این مرکز کاری در عملیات سفارش‌های تولید استفاده شده و قابل حذف نیست؛ می‌توانید آن را غیرفعال کنید.");

        entity.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<WorkCenter> Load(int id, CancellationToken ct) =>
        await _context.WorkCenters.FirstOrDefaultAsync(x => x.Id == id, ct)
        ?? throw new KeyNotFoundException("مرکز کاری یافت نشد.");

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
