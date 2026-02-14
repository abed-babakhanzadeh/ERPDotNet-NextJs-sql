using ERPDotNet.Application.Common.Attributes;
using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Inventory.Commands.UpdateLocation;

[CacheInvalidation("Locations", "Warehouses")] // کش لیست لوکیشن‌ها و انبارها باطل شود
public record UpdateLocationCommand : IRequest<bool>
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public required string Code { get; set; }
    public int? ParentId { get; set; }
    public bool IsBlocked { get; set; }
    public string RowVersion { get; set; } = string.Empty;
}

public class UpdateLocationHandler : IRequestHandler<UpdateLocationCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateLocationHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateLocationCommand request, CancellationToken cancellationToken)
    {
        // 1. دریافت رکورد
        var entity = await _context.Locations
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        // بجای NotFoundException طبق الگوی شما false برمی‌گردانیم
        if (entity == null) return false;

        // 2. مدیریت همروندی (Concurrency) طبق الگوی انبار
        if (!string.IsNullOrEmpty(request.RowVersion))
        {
            _context.Entry(entity).Property(x => x.RowVersion).OriginalValue = 
                Convert.FromBase64String(request.RowVersion);
        }

        // 3. چک کردن تکراری نبودن کد در همان سطح (ParentId یکسان)
        var isDuplicate = await _context.Locations
            .AnyAsync(x => x.WarehouseId == entity.WarehouseId 
                        && x.ParentId == request.ParentId 
                        && x.Code == request.Code 
                        && x.Id != request.Id, cancellationToken);
        
        if (isDuplicate)
            throw new BusinessRuleException("کد لوکیشن در این سطح تکراری است.");

        // 4. لاجیک تغییر مسیر (Path Logic) - Tier-0 Feature
        bool pathChanged = false;
        string oldPath = entity.Path;
        string newPathPrefix = request.Code; // پیش‌فرض برای حالت ریشه

        // اگر والد یا کد تغییر کرده باشد، مسیر تغییر می‌کند
        if (entity.ParentId != request.ParentId || entity.Code != request.Code)
        {
            pathChanged = true;
            
            if (request.ParentId.HasValue)
            {
                var parent = await _context.Locations.FindAsync(new object[] { request.ParentId.Value }, cancellationToken);
                if (parent == null) throw new BusinessRuleException("لوکیشن والد یافت نشد.");
                
                // جلوگیری از ارجاع حلقوی (نمی‌توان پدر را فرزند خودش کرد)
                if (parent.Path.StartsWith(oldPath + "/") || parent.Id == entity.Id)
                    throw new BusinessRuleException("نمیتوان لوکیشن را به زیرمجموعه خودش منتقل کرد.");

                // مسیر جدید = مسیر پدر + / + کد جدید
                newPathPrefix = parent.Path + "/" + request.Code;
            }
        }

        // اعمال تغییرات روی انتیتی
        entity.Title = request.Title;
        entity.Code = request.Code;
        entity.ParentId = request.ParentId;
        entity.IsBlocked = request.IsBlocked;

        if (pathChanged)
        {
            entity.Path = newPathPrefix;

            // === Tier-0 Performance Update ===
            // آپدیت کردن تمام فرزندان با یک دستور SQL بدون لود کردن آنها در حافظه
            // اگر مسیر قدیم "A/B" بود و جدید شد "A/C"
            // فرزندی با مسیر "A/B/D" باید بشود "A/C/D"
            
            // محاسبه طول مسیر قدیم برای برش رشته (در SQL ایندکس از 1 شروع می‌شود ولی EF هندل می‌کند)
            // ما فقط فرزندان مستقیم و غیرمستقیم را آپدیت می‌کنیم
            await _context.Locations
                .Where(x => x.Path.StartsWith(oldPath + "/"))
                .ExecuteUpdateAsync(s => s.SetProperty(
                    p => p.Path,
                    // فرمول: مسیر جدید + ادامه مسیر قبلی (بعد از مسیر والد قدیم)
                    p => newPathPrefix + "/" + p.Path.Substring(oldPath.Length + 1)
                ), cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}