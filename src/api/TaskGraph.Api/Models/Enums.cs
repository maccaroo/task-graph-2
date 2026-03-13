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
