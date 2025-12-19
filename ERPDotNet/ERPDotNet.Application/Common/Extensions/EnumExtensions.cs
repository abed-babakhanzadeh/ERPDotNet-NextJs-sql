using System.ComponentModel.DataAnnotations;
using System.Reflection;

namespace ERPDotNet.Application.Common.Extensions;

public static class EnumExtensions
{
    public static string ToDisplay(this Enum value)
    {
        if (value == null) return "";

        var type = value.GetType();
        var member = type.GetMember(value.ToString());
        
        if (member.Length == 0) return value.ToString();

        var attributes = member[0].GetCustomAttributes(typeof(DisplayAttribute), false);

        if (attributes.Length > 0)
        {
            return ((DisplayAttribute)attributes[0]).Name ?? value.ToString();
        }

        return value.ToString();
    }
}