namespace ERPDotNet.Application.Common.Exceptions;

// کاربر شناخته‌شده است اما اجازه این عملیات را ندارد (HTTP 403)
public class ForbiddenAccessException : Exception
{
    public ForbiddenAccessException(string message = "شما دسترسی لازم برای این عملیات را ندارید.") : base(message)
    {
    }
}
