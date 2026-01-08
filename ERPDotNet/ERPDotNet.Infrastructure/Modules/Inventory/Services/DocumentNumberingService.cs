using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using ERPDotNet.Domain.Modules.Inventory.Enums;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace ERPDotNet.Infrastructure.Modules.Inventory.Services;

public interface IDocumentNumberingService
{
    Task<long> GetNextDocNumberAsync(int docTypeId, int? fiscalYearId, CancellationToken token);
}

public class DocumentNumberingService : IDocumentNumberingService
{
    private readonly IApplicationDbContext _context;

    public DocumentNumberingService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<long> GetNextDocNumberAsync(int docTypeId, int? fiscalYearId, CancellationToken token)
    {
        // استراتژی Retry برای برخورد (Collision)
        // اگر دو نفر همزمان شماره بخواهند، یکی خطا می‌خورد. ما اینجا ۳ بار تلاش مجدد می‌کنیم.
        int retries = 3;
        while (retries > 0)
        {
            try
            {
                // 1. پیدا کردن رکورد شمارنده
                var sequence = await _context.Set<DocumentSequence>()
                    .FirstOrDefaultAsync(x => x.DocTypeId == docTypeId && x.FiscalYearId == fiscalYearId, token);

                if (sequence == null)
                {
                    // اگر اولین بار است، رکورد را می‌سازیم
                    sequence = new DocumentSequence
                    {
                        DocTypeId = docTypeId,
                        FiscalYearId = fiscalYearId,
                        LastValue = 0
                    };
                    _context.Set<DocumentSequence>().Add(sequence);
                }

                // 2. افزایش مقدار (Atomic Increment)
                sequence.LastValue++;
                
                // 3. ذخیره با استفاده از RowVersion
                // اگر در این فاصله کس دیگری عدد را زیاد کرده باشد، اینجا DbUpdateConcurrencyException می‌خوریم
                await _context.SaveChangesAsync(token);

                return sequence.LastValue;
            }
            catch (DbUpdateConcurrencyException)
            {
                // برخورد رخ داد! دوباره تلاش کن (شماره بعدی را بگیر)
                retries--;
                if (retries == 0) throw new Exception("ترافیک بالای سیستم: لطفاً مجدد تلاش کنید.");
                
                // پاک کردن State کانتکست برای تلاش مجدد تمیز
                _context.ChangeTracker.Clear();
            }
        }
        
        throw new Exception("خطای سیستمی در تولید شماره سند.");
    }
}