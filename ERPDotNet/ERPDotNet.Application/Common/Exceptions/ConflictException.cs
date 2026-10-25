namespace ERPDotNet.Application.Common.Exceptions;

// تعارض با وضعیت فعلی داده: تغییر همزمان توسط کاربر دیگر، رکورد تکراری، ... (HTTP 409)
public class ConflictException : Exception
{
    public const string ConcurrencyMessage = "این اطلاعات همزمان توسط کاربر دیگری تغییر کرده است. صفحه را تازه کنید و دوباره تلاش کنید.";

    public ConflictException(string message) : base(message)
    {
    }

    public static ConflictException Concurrency() => new(ConcurrencyMessage);
}
