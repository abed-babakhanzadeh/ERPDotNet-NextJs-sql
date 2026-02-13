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

    public static List<OptionDto> ToList<TEnum>() where TEnum : Enum
    {
        return Enum.GetValues(typeof(TEnum))
            .Cast<TEnum>()
            .Select(e => new OptionDto 
            { 
                Value = Convert.ToInt32(e), 
                Label = e.ToDisplay() // از متد ToDisplay موجود در پروژه شما استفاده می‌کند
            })
            .ToList();
    }

    public class OptionDto
    {
        public int Value { get; set; }
        public string Label { get; set; } = string.Empty;
    }
}