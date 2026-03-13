using TaskGraph.Api.Models;
using TaskStatus = TaskGraph.Api.Models.TaskStatus;

namespace TaskGraph.Api.DTOs.Tasks;

public record CreateTaskRequest(
    string Title,
    string? Description = null,
    Guid? AssigneeId = null,
    TaskStatus Status = TaskStatus.Incomplete,
    TaskPriority Priority = TaskPriority.Medium,
    List<string>? Tags = null,
    TimingType StartType = TimingType.None,
    DateTime? StartDate = null,
    TimingType EndType = TimingType.None,
    DateTime? EndDate = null,
    TimeSpan? Duration = null
);
