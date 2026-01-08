namespace ERPDotNet.Application.Common.Exceptions;

public class BusinessRuleException : Exception
{
    public IEnumerable<string> Errors { get; }

    public BusinessRuleException(string message) : base(message)
    {
        Errors = new[] { message };
    }

    public BusinessRuleException(IEnumerable<string> errors) 
        : base("One or more business rules failed.")
    {
        Errors = errors;
    }
}