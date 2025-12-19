using System;

namespace ERPDotNet.Application.Common.Attributes;

[AttributeUsage(AttributeTargets.Class)]
public class CachedAttribute : Attribute
{
    public int TimeToLiveSeconds { get; }
    public string[] Tags { get; } // لیست تگ‌ها

    public CachedAttribute(int timeToLiveSeconds = 60, params string[] tags)
    {
        TimeToLiveSeconds = timeToLiveSeconds;
        Tags = tags;
    }
}