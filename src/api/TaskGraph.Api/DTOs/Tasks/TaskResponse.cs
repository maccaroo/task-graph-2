using TaskGraph.Api.Models;
using TaskStatus = TaskGraph.Api.Models.TaskStatus;

namespace TaskGraph.Api.DTOs.Tasks;

public record PinnedPositionDto(double X, double Y);

public record TaskResponse(
    Guid Id,
    string Title,
    string? Description,
    Guid? AssigneeId,
    string? AssigneeUsername,
    TaskStatus Status,
    TaskPriority Priority,
    List<string> Tags,
    TimingType StartType,
    DateTime? StartDate,
    TimingType EndType,
    DateTime? EndDate,
    TimeSpan? Duration,
    PinnedPositionDto? PinnedPosition,
    List<Guid> PredecessorIds,
    List<Guid> SuccessorIds
);
