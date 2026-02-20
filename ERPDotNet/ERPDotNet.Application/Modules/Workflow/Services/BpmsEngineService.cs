using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Application.Modules.Workflow.Contracts;
using ERPDotNet.Application.Modules.Workflow.Interfaces;
using ERPDotNet.Domain.Modules.Workflow.Entities;
using ERPDotNet.Domain.Modules.Workflow.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ERPDotNet.Application.Modules.Workflow.Services;

public class BpmsEngineService : IBpmsEngineService
{
    private readonly IApplicationDbContext _context;
    private readonly IBpmsRuleEvaluator _ruleEvaluator;
    private readonly IBpmsActionResolver _actionResolver;
    private readonly ILogger<BpmsEngineService> _logger;

    public BpmsEngineService(
        IApplicationDbContext context, 
        IBpmsRuleEvaluator ruleEvaluator, 
        IBpmsActionResolver actionResolver,
        ILogger<BpmsEngineService> logger)
    {
        _context = context;
        _ruleEvaluator = ruleEvaluator;
        _actionResolver = actionResolver;
        _logger = logger;
    }

    // ==============================================================================
    // 1. شروع یک فرآیند جدید (مثلاً پس از ثبت رسید انبار)
    // ==============================================================================
    public async Task<long> StartProcessAsync(StartProcessRequest request, CancellationToken cancellationToken)
    {
        // 1. پیدا کردن نسخه فعال فرآیند
        var processVersion = await _context.BpmsProcessVersions
            .Include(x => x.Process)
            .Include(x => x.States)
            .FirstOrDefaultAsync(x => x.Process.ProcessCode == request.ProcessCode && 
                                      x.Process.CompanyId == request.CompanyId && 
                                      x.IsActive, cancellationToken);

        if (processVersion == null)
            throw new BusinessRuleException($"فرآیند فعال برای کد {request.ProcessCode} یافت نشد.");

        // 2. پیدا کردن گره شروع (Start State)
        var startState = processVersion.States.FirstOrDefault(x => x.Type == BpmsStateType.Start);
        if (startState == null)
            throw new BusinessRuleException("گره شروع (Start State) برای این فرآیند تعریف نشده است.");

        // 3. ساخت نمونه جدید (Instance)
        var instance = new BpmsInstance
        {
            CompanyId = request.CompanyId,
            ProcessVersionId = processVersion.Id,
            TargetRecordId = request.TargetRecordId,
            CurrentStateId = startState.Id,
            Status = BpmsInstanceStatus.Running
        };

        // اعمال متغیرهای اولیه (مثل مبلغ، کاربر ایجاد کننده و غیره)
        instance.Variables.SetVariables(request.InitialVariables);

        // 4. ثبت تاریخچه شروع کار
        var history = new BpmsHistory
        {
            Instance = instance,
            ActionTitle = "شروع فرآیند",
            FromStateId = startState.Id,
            ToStateId = startState.Id,
            PerformedByUserId = request.UserId,
            Comment = "ایجاد خودکار سیستم"
        };

        _context.BpmsInstances.Add(instance);
        _context.BpmsHistories.Add(history);

        // 5. ایجاد وظایف (Tasks) برای وضعیت شروع (در صورت نیاز)
        await CreateTasksForStateAsync(instance, startState.Id, request.CompanyId, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Bpms Process {ProcessCode} started. InstanceId: {InstanceId}", request.ProcessCode, instance.Id);

        return instance.Id;
    }

    // ==============================================================================
    // 2. اجرای انتقال وضعیت (هنگام کلیک روی دکمه در کارتابل)
    // ==============================================================================
    public async Task ExecuteTransitionAsync(ExecuteTransitionRequest request, CancellationToken cancellationToken)
    {
        // 🌟 Transaction Boundary: یا همه چیز انجام می‌شود یا هیچ چیز
        using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            // 1. بارگذاری Aggregate با قفل هم‌روندی (Concurrency)
            var instance = await _context.BpmsInstances
                .Include(x => x.ProcessVersion).ThenInclude(p => p.Process)
                .Include(x => x.Tasks.Where(t => !t.IsCompleted))
                .FirstOrDefaultAsync(x => x.Id == request.InstanceId, cancellationToken);

            if (instance == null)
                throw new BusinessRuleException("پرونده یافت نشد.");

            if (instance.Status != BpmsInstanceStatus.Running)
                throw new BusinessRuleException("این فرآیند در حال اجرا نیست و امکان تغییر وضعیت ندارد.");

            // 2. بارگذاری یال (Transition) با تمام جزئیات (قوانین و نقش‌ها)
            var transition = await _context.BpmsTransitions
                .Include(x => x.Rules)
                .Include(x => x.AllowedRoles)
                .Include(x => x.ToState)
                .FirstOrDefaultAsync(x => x.Id == request.TransitionId && 
                                          x.FromStateId == instance.CurrentStateId, cancellationToken);

            if (transition == null)
                throw new BusinessRuleException("انتقال درخواستی معتبر نیست یا پرونده در وضعیت دیگری قرار دارد.");

            // 3. اعمال متغیرهای جدید از طریق فرم کارتابل (مثلاً تیک تایید)
            if (request.ExtraVariables != null && request.ExtraVariables.Any())
            {
                instance.Variables.SetVariables(request.ExtraVariables);
            }

            // 4. اعتبارسنجی سطح دسترسی و موتور قوانین (Rule Evaluation)
            ValidateTransition(transition, request.UserId, instance.Variables.Data);

            // 5. تغییر وضعیت (State Change)
            int oldStateId = instance.CurrentStateId;
            instance.CurrentStateId = transition.ToStateId;

            // اگر به گره پایانی رسیدیم، فرآیند را ببند
            if (transition.ToState.Type == BpmsStateType.End)
            {
                instance.Status = BpmsInstanceStatus.Completed;
            }

            // 6. بستن وظایف (Tasks) قبلی مربوط به وضعیت فعلی
            foreach (var task in instance.Tasks)
            {
                task.IsCompleted = true;
                task.CompletedDate = DateTime.UtcNow;
            }

            // 7. ثبت تاریخچه (Audit Trail)
            var history = new BpmsHistory
            {
                InstanceId = instance.Id,
                FromStateId = oldStateId,
                ToStateId = transition.ToStateId,
                ActionTitle = transition.ActionTitle,
                PerformedByUserId = request.UserId,
                Comment = request.Comment
            };
            _context.BpmsHistories.Add(history);

            // 8. ایجاد تسک‌های جدید در کارتابل
            if (instance.Status == BpmsInstanceStatus.Running)
            {
                await CreateTasksForStateAsync(instance, transition.ToStateId, instance.CompanyId, cancellationToken);
            }

            // 9. 🌟 جادوی Enterprise: اجرای اکشن تجاری (مثلاً ماژول انبار)
            if (!string.IsNullOrEmpty(transition.ActionCode))
            {
                var actionHandler = _actionResolver.Resolve(transition.ActionCode);
                if (actionHandler == null)
                {
                    throw new BusinessRuleException($"هندلر اکشن برای کد {transition.ActionCode} یافت نشد.");
                }

                var context = new BpmsActionContext
                {
                    CompanyId = instance.CompanyId,
                    InstanceId = instance.Id,
                    TargetRecordId = instance.TargetRecordId,
                    TargetEntityName = instance.ProcessVersion.Process.TargetEntityName,
                    UserId = request.UserId,
                    Variables = new Dictionary<string, object?>(instance.Variables.Data)
                };

                // اکشن در همان تراکنش دیتابیس اجرا می‌شود!
                await actionHandler.ExecuteAsync(context, cancellationToken);
            }

            // ذخیره تغییرات دیتابیس
            await _context.SaveChangesAsync(cancellationToken);
            
            // کامیت کردن تراکنش
            await transaction.CommitAsync(cancellationToken);
            
            _logger.LogInformation("Transition {TransitionTitle} executed for Instance {InstanceId}", transition.ActionTitle, instance.Id);
        }
        catch (DbUpdateConcurrencyException)
        {
            // 🌟 لایه دوم محافظت: خطای هم‌روندی دیتابیس
            await transaction.RollbackAsync(cancellationToken);
            throw new BusinessRuleException("موجودی کالا یا وضعیت این پرونده دقیقاً در همین لحظه توسط کاربر دیگری تغییر کرده است. لطفاً کارتابل خود را رفرش کرده و مجدداً تلاش کنید.");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            _logger.LogError(ex, "Error executing transition {TransitionId} for Instance {InstanceId}", request.TransitionId, request.InstanceId);
            throw;
        }
    }

    // ==============================================================================
    // متدهای کمکی خصوصی
    // ==============================================================================

    private void ValidateTransition(BpmsTransition transition, string userId, IReadOnlyDictionary<string, object?> variables)
    {
        // الف) بررسی سطح دسترسی (فعلاً در فاز اولیه از دسترسی صرف‌نظر می‌کنیم یا باید سرویس UserRoles اینجا چک شود)
        // در پروژه‌های واقعی، لیست Roleهای کاربر را از ICurrentUserService می‌گیریم و با transition.AllowedRoles تطبیق می‌دهیم.
        /* var userRoles = _currentUserService.GetRoles();
        if (transition.AllowedRoles.Any() && !transition.AllowedRoles.Any(r => userRoles.Contains(r.RoleId)))
            throw new BusinessRuleException("شما دسترسی اجرای این عملیات را ندارید.");
        */

        // ب) اجرای موتور قوانین
        if (transition.Rules.Any())
        {
            bool isAllowed = _ruleEvaluator.Evaluate(transition.Rules.ToList(), variables);
            if (!isAllowed)
            {
                throw new BusinessRuleException("شرایط لازم برای انتقال به این وضعیت (طبق قوانین تعریف‌شده) برقرار نیست.");
            }
        }
    }

    private async Task CreateTasksForStateAsync(BpmsInstance instance, int stateId, int companyId, CancellationToken cancellationToken)
    {
        // در یک سیستم واقعی، اینجا بر اساس تنظیمات State، تعیین می‌کنیم که تسک برای چه نقشی برود.
        // فعلاً یک تسک عمومی (برای کارتابل) می‌سازیم.
        
        var task = new BpmsTask
        {
            Instance = instance,
            StateId = stateId,
            CompanyId = companyId,
            Title = $"بررسی پرونده شماره {instance.TargetRecordId}",
            IsCompleted = false,
            // می‌توان دیتای حیاتی (مبلغ و غیره) را در SummaryJson ذخیره کرد تا کارتابل سریع لود شود
        };

        _context.BpmsTasks.Add(task);
        await Task.CompletedTask;
    }
}