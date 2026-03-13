namespace TaskGraph.Api.Models;

public class TaskItem
{
    public Guid Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public Guid? AssigneeId { get; set; }
    public User? Assignee { get; set; }
    public TaskStatus Status { get; set; } = TaskStatus.Incomplete;
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public List<string> Tags { get; set; } = [];
    public TimingType StartType { get; set; } = TimingType.None;
    public DateTime? StartDate { get; set; }
    public TimingType EndType { get; set; } = TimingType.None;
    public DateTime? EndDate { get; set; }
    public TimeSpan? Duration { get; set; }
    public PinnedPosition? PinnedPosition { get; set; }

    public ICollection<TaskRelationship> Predecessors { get; set; } = [];
    public ICollection<TaskRelationship> Successors { get; set; } = [];
}
