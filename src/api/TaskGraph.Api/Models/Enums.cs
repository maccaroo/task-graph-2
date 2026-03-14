namespace TaskGraph.Api.Models;

public enum TaskStatus
{
    Incomplete,
    Complete
}

public enum TaskPriority
{
    Low,
    Medium,
    High
}

public enum TimingType
{
    None,
    Fixed,
    Flexible
}

public enum NotificationType
{
    TaskReminder,
    AssignmentAlert
}

public enum RelationshipType
{
    /// <summary>Predecessor end ≤ successor start (most common).</summary>
    Exclusive,
    /// <summary>Predecessor start ≤ successor start.</summary>
    HaveStarted,
    /// <summary>Predecessor end ≤ successor end.</summary>
    HaveCompleted,
    /// <summary>Predecessor start ≤ successor end.</summary>
    HandOff,
}
