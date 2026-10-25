namespace ERPDotNet.Application.Modules.Workflow.DTOs;

public class TaskDetailsDto
{
    public long TaskId { get; set; }
    public long InstanceId { get; set; }
    public string ProcessCode { get; set; } = string.Empty;
    public string ProcessTitle { get; set; } = string.Empty;
    public string TaskTitle { get; set; } = string.Empty;
    public string StateTitle { get; set; } = string.Empty;
    public long TargetRecordId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? DueDate { get; set; }
    public bool IsOverdue { get; set; }

    // کاربر فقط با نقش ارجاع پس از سررسید (نه نقش دکمه‌ها) به این پرونده دسترسی دارد
    public bool ViaEscalation { get; set; }

    // 🌟 لیست دکمه‌هایی که کاربر مجاز است روی این تسک کلیک کند
    public List<TaskTransitionDto> AvailableTransitions { get; set; } = new();

    // تاریخچه اقدام‌های پرونده؛ اقدام با تفویض نام تفویض‌کننده را هم دارد
    public List<TaskHistoryDto> History { get; set; } = new();
}

public class TaskHistoryDto
{
    public string ActionTitle { get; set; } = string.Empty;
    public string PerformedBy { get; set; } = string.Empty;
    public string? OnBehalfOf { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class TaskTransitionDto
{
    public int TransitionId { get; set; }
    
    // عنوانی که روی دکمه در فرانت‌اند نوشته می‌شود (مثل: "تایید نهایی" یا "ارجاع به کارشناس")
    public string ActionTitle { get; set; } = string.Empty; 
    
    // (اختیاری) می‌توانید بعداً فیلدی مثل ColorClass هم به دیتابیس اضافه کنید تا دکمه تایید سبز و دکمه رد قرمز شود
    // 🌟 فیلد جدید رنگ دکمه که مستقیماً به فرانت‌اند می‌رود
    public string ButtonVariant { get; set; } = "default";
}