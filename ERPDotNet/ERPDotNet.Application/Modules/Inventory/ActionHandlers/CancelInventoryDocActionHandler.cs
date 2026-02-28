using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Workflow.Contracts;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using ERPDotNet.Domain.Modules.Workflow.Enums;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.ActionHandlers;

public class CancelInventoryDocActionHandler : IBpmsActionHandler
{
    private readonly IApplicationDbContext _context;

    public CancelInventoryDocActionHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    // 🌟 کد استراتژیک برای ابطال
    public string ActionCode => "INVENTORY_CANCEL";

    public async Task ExecuteAsync(BpmsActionContext context, CancellationToken cancellationToken)
    {
        // 1. تغییر وضعیت سند انبار به "ابطال شده" (تا قفل شود و دیگر ویرایش نشود)
        var doc = await _context.InventoryDocHeaders
            .FirstOrDefaultAsync(x => x.Id == context.TargetRecordId, cancellationToken);

        if (doc != null)
        {
            doc.Status = InventoryDocStatus.Cancelled;
        }

        // 2. کشتن و پایان دادن به پرونده گردش کار در BPMS
        var instance = await _context.BpmsInstances
            .Include(i => i.Tasks)
            .FirstOrDefaultAsync(x => x.Id == context.InstanceId, cancellationToken);

        if (instance != null)
        {
            instance.Status = BpmsInstanceStatus.Terminated; // تغییر وضعیت پرونده به لغو شده
            
            // بستن تمام تسک‌های باز تا از همه کارتابل‌ها محو شود
            foreach (var task in instance.Tasks.Where(t => !t.IsCompleted))
            {
                task.IsCompleted = true;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}