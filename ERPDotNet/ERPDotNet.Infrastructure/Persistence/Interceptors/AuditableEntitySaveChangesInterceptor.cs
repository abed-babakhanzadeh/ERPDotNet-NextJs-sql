using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace ERPDotNet.Infrastructure.Persistence.Interceptors;

public class AuditableEntitySaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly ICurrentUserService _currentUserService;
    private static bool _isSavingAudit = false; // جلوگیری از لوپ بی‌نهایت

    public AuditableEntitySaveChangesInterceptor(ICurrentUserService currentUserService)
    {
        _currentUserService = currentUserService;
    }

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        // حل ارور CS8602: چک کردن نال بودن کانتکست
        if (eventData.Context == null) 
        {
            return await base.SavingChangesAsync(eventData, result, cancellationToken);
        }

        if (_isSavingAudit) 
        {
            return await base.SavingChangesAsync(eventData, result, cancellationToken);
        }

        var auditEntries = OnBeforeSaveChanges(eventData.Context);

        var resultState = await base.SavingChangesAsync(eventData, result, cancellationToken);

        if (auditEntries != null && auditEntries.Count > 0)
        {
            await OnAfterSaveChanges(eventData.Context, auditEntries, cancellationToken);
        }

        return resultState;
    }

    private List<AuditEntry> OnBeforeSaveChanges(DbContext context)
    {
        context.ChangeTracker.DetectChanges();
        var auditEntries = new List<AuditEntry>();

        var userId = _currentUserService.UserId;

        foreach (var entry in context.ChangeTracker.Entries<BaseEntity>())
        {
            // حل ارور CS0184: اگر AuditTrail از BaseEntity ارث نبرده باشد، این چک لازم نیست.
            // اما محض احتیاط به صورت ایمن چک می‌کنیم که نوعش AuditTrail نباشد
            if (entry.Entity.GetType() == typeof(AuditTrail) || entry.State == EntityState.Detached || entry.State == EntityState.Unchanged)
                continue;

            var auditEntry = new AuditEntry(entry)
            {
                TableName = entry.Entity.GetType().Name,
                UserId = userId ?? "Anonymous",
                AuditType = entry.State.ToString() // مقدار پیش‌فرض موقت برای رفع ارور required
            };

            auditEntries.Add(auditEntry);

            foreach (var property in entry.Properties)
            {
                if (property.IsTemporary) continue;

                string propertyName = property.Metadata.Name;
                
                if (property.Metadata.IsPrimaryKey())
                {
                    auditEntry.KeyValues[propertyName] = property.CurrentValue;
                    continue;
                }

                switch (entry.State)
                {
                    case EntityState.Added:
                        auditEntry.AuditType = "Create";
                        auditEntry.NewValues[propertyName] = property.CurrentValue;
                        
                        entry.Entity.CreatedAt = DateTime.UtcNow;
                        entry.Entity.CreatedBy = userId;
                        break;

                    case EntityState.Deleted:
                        auditEntry.AuditType = "Delete";
                        auditEntry.OldValues[propertyName] = property.OriginalValue;
                        break;

                    case EntityState.Modified:
                        if (property.IsModified)
                        {
                            // حل ارور CS8605: آنباکسینگ ایمن (Safe Unboxing)
                            // چک می‌کنیم آیا مقدار boolean است و آیا مقدارش true است؟
                            if (propertyName == nameof(BaseEntity.IsDeleted) && 
                                property.CurrentValue is bool isDeleted && 
                                isDeleted)
                            {
                                auditEntry.AuditType = "SoftDelete";
                            }
                            else
                            {
                                auditEntry.AuditType = "Update";
                            }
                            
                            auditEntry.ChangedColumns.Add(propertyName);
                            auditEntry.OldValues[propertyName] = property.OriginalValue;
                            auditEntry.NewValues[propertyName] = property.CurrentValue;
                        }
                        
                        entry.Entity.LastModifiedAt = DateTime.UtcNow;
                        entry.Entity.LastModifiedBy = userId;
                        break;
                }
            }
        }
        
        // حذف مواردی که هیچ تغییری نداشتند
        var emptyEntries = auditEntries.Where(e => !e.KeyValues.Any() && e.NewValues.Count == 0 && e.OldValues.Count == 0).ToList();
        foreach (var empty in emptyEntries)
        {
            auditEntries.Remove(empty);
        }

        return auditEntries;
    }

    private async Task OnAfterSaveChanges(DbContext context, List<AuditEntry> auditEntries, CancellationToken cancellationToken)
    {
        _isSavingAudit = true;

        try
        {
            foreach (var auditEntry in auditEntries)
            {
                foreach (var prop in auditEntry.Entry.Properties)
                {
                    if (prop.Metadata.IsPrimaryKey())
                    {
                        // اینجا مقدار ID تولید شده را می‌گیریم
                        auditEntry.KeyValues[prop.Metadata.Name] = prop.CurrentValue;
                    }
                }
                context.Set<AuditTrail>().Add(auditEntry.ToAuditTrail());
            }

            await context.SaveChangesAsync(cancellationToken);
        }
        finally
        {
            _isSavingAudit = false;
        }
    }
}