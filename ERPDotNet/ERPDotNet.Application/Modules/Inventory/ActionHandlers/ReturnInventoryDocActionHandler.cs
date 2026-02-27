using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Workflow.Contracts;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.ActionHandlers;

public class ReturnInventoryDocActionHandler : IBpmsActionHandler
{
    private readonly IApplicationDbContext _context;

    public ReturnInventoryDocActionHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    // این دقیقاً همان کدی است که به دکمه "رد" متصل می‌کنیم
    public string ActionCode => "INVENTORY_RETURN";

    public async Task ExecuteAsync(BpmsActionContext context, CancellationToken cancellationToken)
    {
        var doc = await _context.InventoryDocHeaders
            .FirstOrDefaultAsync(x => x.Id == context.TargetRecordId, cancellationToken);

        if (doc != null)
        {
            // 🌟 تغییر وضعیت سند به پیش‌نویس تا دوباره قفل آن باز شود و قابل ویرایش باشد
            doc.Status = InventoryDocStatus.Draft; 
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}