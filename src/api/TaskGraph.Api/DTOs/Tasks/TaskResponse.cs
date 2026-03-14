using TaskGraph.Api.Models;
using TaskStatus = TaskGraph.Api.Models.TaskStatus;

namespace TaskGraph.Api.DTOs.Tasks;

public record PinnedPositionDto(double X, double Y);

/// <summary>Full relationship info including type, keyed by the related task's ID.</summary>
public record TaskRelationshipInfo(Guid RelatedTaskId, RelationshipType Type);

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
    List<Guid> SuccessorIds,
    List<TaskRelationshipInfo> Predecessors,
    List<TaskRelationshipInfo> Successors
);
