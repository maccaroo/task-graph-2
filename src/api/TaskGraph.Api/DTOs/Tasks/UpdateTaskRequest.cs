using TaskGraph.Api.Models;
using TaskStatus = TaskGraph.Api.Models.TaskStatus;

namespace TaskGraph.Api.DTOs.Tasks;

public record UpdateTaskRequest(
    string Title,
    string? Description,
    Guid? AssigneeId,
    TaskStatus Status,
    TaskPriority Priority,
    List<string> Tags,
    TimingType StartType,
    DateTime? StartDate,
    TimingType EndType,
    DateTime? EndDate,
    TimeSpan? Duration
);
