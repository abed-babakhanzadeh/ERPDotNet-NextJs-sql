using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Workflow.Contracts;
using ERPDotNet.Application.Modules.Workflow.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using ERPDotNet.Domain.Modules.Workflow.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.SubmitInventoryDoc;

public record SubmitInventoryDocCommand(long Id) : IRequest<bool>;

public class SubmitInventoryDocValidator : AbstractValidator<SubmitInventoryDocCommand>
{
    public SubmitInventoryDocValidator()
    {
        RuleFor(v => v.Id).GreaterThan(0);
    }
}

public class SubmitInventoryDocHandler : IRequestHandler<SubmitInventoryDocCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IBpmsEngineService _bpmsEngine;
    private readonly ICurrentUserService _currentUserService;

    public SubmitInventoryDocHandler(
        IApplicationDbContext context, 
        IBpmsEngineService bpmsEngine,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _bpmsEngine = bpmsEngine;
        _currentUserService = currentUserService;
    }

    public async Task<bool> Handle(SubmitInventoryDocCommand request, CancellationToken cancellationToken)
    {
        // استخراج CompanyId واقعی کاربر از توکن برای موتور گردش کار
        int userCompanyId = int.TryParse(_currentUserService.CompanyId, out var cid) ? cid : 
                            throw new UnauthorizedAccessException("شناسه شرکت کاربر نامشخص است.");

        // 🌟 فیکس ارور اول: حذف CompanyId از این کوئری
        var doc = await _context.InventoryDocHeaders
            .Include(x => x.Details)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (doc == null)
            throw new KeyNotFoundException("سند یافت نشد.");

        // 🌟 جلوگیری از ارسال اسناد قطعی شده یا در حال اجرا
        if (doc.Status != InventoryDocStatus.Draft && doc.Status != InventoryDocStatus.RequiresRevision)
            throw new BusinessRuleException("فقط اسناد پیش‌نویس یا نیازمند اصلاح قابل ارسال برای بررسی هستند.");

        if (!doc.Details.Any())
            throw new BusinessRuleException("سند فاقد اقلام است و نمی‌تواند وارد چرخه تایید شود.");

        // 🌟 گاردریل جلوگیری از باگ تکرار (ایجاد دو ردیف در کارتابل)
        var isAlreadyRunning = await _context.BpmsInstances
            .AnyAsync(x => x.TargetRecordId == doc.Id && x.Status == BpmsInstanceStatus.Running, cancellationToken);
            
        if (isAlreadyRunning)
            throw new BusinessRuleException("این سند در حال حاضر در چرخه بررسی قرار دارد و نمی‌تواند مجدداً ارسال شود.");

        // استخراج متغیرهای بیزینسی برای موتور قوانین
        // 🌟 فیکس ارور دوم: بازگرداندن نوع به Dictionary استاندارد
        var variablesDict = new Dictionary<string, object?>
        {
            { "TotalItems", doc.Details.Sum(x => x.MainUnitQuantity) },
            { "DocTypeId", doc.DocTypeId },
            { "WarehouseId", doc.WarehouseId }
        };

        // استارت موتور BPMS
        await _bpmsEngine.StartProcessAsync(new StartProcessRequest
        {
            CompanyId = userCompanyId, 
            ProcessCode = "INVENTORY_V1",
            TargetRecordId = doc.Id,
            UserId = _currentUserService.UserId ?? "System",
            InitialVariables = variablesDict // 🌟 پاس دادن صحیح د딕شنری
        }, cancellationToken);

        // تغییر وضعیت سند انبار به "در انتظار تایید" برای قفل شدن عملیات حذف و ویرایش
        doc.Status = InventoryDocStatus.InProcess; 
        
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}