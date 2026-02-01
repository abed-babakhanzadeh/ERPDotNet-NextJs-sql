using ERPDotNet.Domain.Modules.Inventory.Enums;

namespace ERPDotNet.Application.Modules.Inventory.Interfaces;

public interface IDocumentNumberingService
{
    Task<long> GetNextDocNumberAsync(int docTypeId, int? fiscalYearId, NumberingScope scope, CancellationToken token);
}
