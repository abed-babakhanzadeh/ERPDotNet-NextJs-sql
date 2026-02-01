using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Inventory.Interfaces; // استفاده از اینترفیس لایه اپلیکیشن
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Services;

public class DocumentNumberingService : IDocumentNumberingService
{
    private readonly IApplicationDbContext _context;

    public DocumentNumberingService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<long> GetNextDocNumberAsync(int docTypeId, int? fiscalYearId, NumberingScope scope, CancellationToken token)
    {
        // استفاده از int? برای متغیرها تا با دیتابیس همخوانی داشته باشند
        int? targetDocTypeId = null;
        int? targetFiscalYearId = null;

        switch (scope)
        {
            case NumberingScope.PerDocType:
                targetDocTypeId = docTypeId;
                targetFiscalYearId = null; // سال مهم نیست
                break;

            case NumberingScope.PerFiscalYear:
                if (fiscalYearId == null) throw new ArgumentNullException("سال مالی الزامی است");
                targetDocTypeId = null; // نوع مهم نیست
                targetFiscalYearId = fiscalYearId;
                break;

            case NumberingScope.Global:
                targetDocTypeId = null;
                targetFiscalYearId = null;
                break;
            
            // === این کیس جدید را اضافه کنید ===
            case NumberingScope.PerDocTypeAndYear:
                if (fiscalYearId == null) throw new ArgumentNullException("سال مالی الزامی است");
                // اینجا هم نوع سند مهم است و هم سال مالی
                // سیستم دنبال رکوردی می‌گردد که هر دو مقدار را داشته باشد
                targetDocTypeId = docTypeId;
                targetFiscalYearId = fiscalYearId;
                break;

            default:
                throw new NotImplementedException("روش شماره‌گذاری ناشناخته است.");
        }

        int retries = 3;
        while (retries > 0)
        {
            try
            {
                // جستجو: چون در انتیتی هم فیلدها int? هستند، مقایسه مشکلی ندارد
                var sequence = await _context.Set<DocumentSequence>()
                    .FirstOrDefaultAsync(x => x.DocTypeId == targetDocTypeId && x.FiscalYearId == targetFiscalYearId, token);

                if (sequence == null)
                {
                    sequence = new DocumentSequence
                    {
                        // اینجا مقداردهی بدون مشکل انجام می‌شود چون پراپرتی‌ها int? هستند
                        DocTypeId = targetDocTypeId,
                        FiscalYearId = targetFiscalYearId,
                        LastValue = 0
                    };
                    _context.Set<DocumentSequence>().Add(sequence);
                }

                sequence.LastValue++;
                await _context.SaveChangesAsync(token);

                return sequence.LastValue;
            }
            catch (DbUpdateConcurrencyException)
            {
                retries--;
                if (retries == 0) throw new Exception("ترافیک بالای ثبت سند: سیستم قادر به تولید شماره سند نیست.");
                _context.ChangeTracker.Clear();
            }
        }
        
        throw new Exception("خطای نامشخص در تولید شماره سند.");
    }
}