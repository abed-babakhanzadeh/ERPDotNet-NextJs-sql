using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Workflow.Contracts;
using ERPDotNet.Application.Modules.Workflow.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Enums;
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
        var doc = await _context.InventoryDocHeaders
            .Include(x => x.Details)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (doc == null) 
            throw new KeyNotFoundException($"سند انبار با شناسه {request.Id} یافت نشد.");

        // فقط اسناد پیش‌نویس قابل ارسال هستند
        if (doc.Status != InventoryDocStatus.Draft)
            throw new BusinessRuleException("فقط اسناد پیش‌نویس (Draft) قابل ارسال به گردش کار هستند.");

        if (!doc.Details.Any())
            throw new BusinessRuleException("سند فاقد اقلام است و نمی‌تواند وارد چرخه تایید شود.");

        // استخراج متغیرهای بیزینسی برای موتور قوانین (Rule Engine)
        var variables = new Dictionary<string, object?>
        {
            { "TotalItems", doc.Details.Sum(x => x.MainUnitQuantity) },
            { "DocTypeId", doc.DocTypeId },
            { "WarehouseId", doc.WarehouseId }
        };

        // 🌟 استخراج CompanyId واقعی کاربر از توکن
        int userCompanyId = int.TryParse(_currentUserService.CompanyId, out var cid) ? cid : 
                            throw new UnauthorizedAccessException("شناسه شرکت کاربر نامشخص است.");

        // استارت موتور BPMS
        await _bpmsEngine.StartProcessAsync(new StartProcessRequest
        {
            CompanyId = userCompanyId, 
            ProcessCode = "INVENTORY_V1",
            TargetRecordId = doc.Id,
            UserId = _currentUserService.UserId ?? "System",
            InitialVariables = variables
        }, cancellationToken);

        // 🌟 تغییر وضعیت سند انبار به "در جریان بررسی"
        // نکته: حتماً وضعیت InProcess را به Enum مربوط به InventoryDocStatus خود اضافه کنید.
        doc.Status = InventoryDocStatus.InProcess; 
        
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}