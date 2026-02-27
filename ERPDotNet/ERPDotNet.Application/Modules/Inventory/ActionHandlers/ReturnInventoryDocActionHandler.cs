using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Workflow.Contracts;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using ERPDotNet.Domain.Modules.Workflow.Enums;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.ActionHandlers;

public class ReturnInventoryDocActionHandler : IBpmsActionHandler
{
    private readonly IApplicationDbContext _context;

    public ReturnInventoryDocActionHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public string ActionCode => "INVENTORY_RETURN";

    public async Task ExecuteAsync(BpmsActionContext context, CancellationToken cancellationToken)
    {
        // 1. برگرداندن وضعیت سند انبار به حالت قابل ویرایش
        var doc = await _context.InventoryDocHeaders
            .FirstOrDefaultAsync(x => x.Id == context.TargetRecordId, cancellationToken);

        if (doc != null)
        {
            doc.Status = InventoryDocStatus.RequiresRevision; // نیازمند اصلاح
        }

        // 🌟 2. کشتن پرونده گردش کار (حل قطعی باگ دو ردیف شدن در کارتابل)
        var instance = await _context.BpmsInstances
            .Include(i => i.Tasks)
            .FirstOrDefaultAsync(x => x.Id == context.InstanceId, cancellationToken);

        if (instance != null)
        {
            // وضعیت پرونده را به پایان‌یافته (لغو شده) تغییر می‌دهیم
            instance.Status = BpmsInstanceStatus.Terminated;
            
            // تمام وظایف باز مربوط به این پرونده را می‌بندیم تا از کارتابل‌ها حذف شوند
            foreach (var task in instance.Tasks.Where(t => !t.IsCompleted))
            {
                task.IsCompleted = true;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}