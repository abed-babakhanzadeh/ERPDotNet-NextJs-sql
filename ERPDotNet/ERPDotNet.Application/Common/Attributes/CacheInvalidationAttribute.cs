using System;

namespace ERPDotNet.Application.Common.Attributes;

[AttributeUsage(AttributeTargets.Class)]
public class CacheInvalidationAttribute : Attribute
{
    public string[] Tags { get; }

    public CacheInvalidationAttribute(params string[] tags)
    {
        Tags = tags;
    }
}